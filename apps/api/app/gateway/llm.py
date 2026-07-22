"""
Provider-agnostic LLM Gateway.

Every AI call goes through this class. It:
- Speaks the OpenAI Chat Completions API.
- Points at OpenRouter by default (any model, any provider).
- Falls back to a deterministic offline stub when no API key is configured
  so the app is fully functional in demo mode.
- Emits usage telemetry (tokens, cost, latency) for the analytics pipeline.
"""
from __future__ import annotations

import asyncio
import json
import re
import time
from dataclasses import dataclass
from functools import lru_cache
from typing import Any, Iterable

import httpx
from pydantic import BaseModel
from tenacity import (
    AsyncRetrying,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.core.config import get_settings
from app.core.logging import get_logger

log = get_logger(__name__)


@dataclass
class LLMCallResult:
    text: str
    tokens: int
    cost_usd: float
    latency_ms: int
    model: str
    provider: str


class LLMGatewayError(RuntimeError):
    pass


class LLMGateway:
    """Async, provider-agnostic gateway."""

    def __init__(self) -> None:
        s = get_settings()
        self.base_url = s.openrouter_base_url.rstrip("/")
        self.api_key = s.openrouter_api_key
        self.default_model = s.default_model
        self.fast_model = s.fast_model
        self.quality_model = s.quality_model
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=60.0)
        return self._client

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    @property
    def is_live(self) -> bool:
        return bool(self.api_key)

    async def chat(
        self,
        messages: list[dict],
        *,
        model: str | None = None,
        temperature: float = 0.2,
        max_tokens: int = 1200,
        response_format: dict | None = None,
    ) -> LLMCallResult:
        model = model or self.default_model
        start = time.perf_counter()

        if not self.is_live:
            # Deterministic offline fallback so the app is usable in demo mode.
            text = _offline_completion(messages, response_format)
            return LLMCallResult(
                text=text,
                tokens=_approx_tokens(text) + sum(_approx_tokens(m.get("content", "")) for m in messages),
                cost_usd=0.0,
                latency_ms=int((time.perf_counter() - start) * 1000),
                model=f"offline:{model}",
                provider="offline",
            )

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://researo.app",
            "X-Title": "Researo",
        }
        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if response_format is not None:
            payload["response_format"] = response_format

        client = await self._get_client()
        text = ""
        tokens = 0
        cost = 0.0
        provider = "openrouter"

        async for attempt in AsyncRetrying(
            stop=stop_after_attempt(3),
            wait=wait_exponential(multiplier=0.5, min=0.5, max=4),
            retry=retry_if_exception_type((httpx.HTTPError, LLMGatewayError)),
            reraise=True,
        ):
            with attempt:
                r = await client.post(
                    f"{self.base_url}/chat/completions", headers=headers, json=payload
                )
                if r.status_code >= 500:
                    raise LLMGatewayError(f"Upstream {r.status_code}: {r.text[:200]}")
                if r.status_code >= 400:
                    log.error("LLM 4xx {} {}", r.status_code, r.text[:300])
                    raise LLMGatewayError(f"LLM error {r.status_code}: {r.text[:200]}")
                data = r.json()
                choice = data["choices"][0]["message"]["content"]
                text = choice or ""
                usage = data.get("usage") or {}
                tokens = int(usage.get("total_tokens") or 0)
                # Not all providers return usage — count locally with tiktoken
                # so token/cost analytics are never zero.
                if tokens == 0:
                    tokens = _count_messages_tokens(messages, text)
                # OpenRouter includes 'usage.total_cost' occasionally
                cost = float(usage.get("total_cost") or 0.0)
                provider = data.get("provider") or "openrouter"

        latency = int((time.perf_counter() - start) * 1000)
        log.info(
            "LLM {} · {} tok · {}ms",
            model,
            tokens,
            latency,
        )
        return LLMCallResult(
            text=text,
            tokens=tokens,
            cost_usd=cost,
            latency_ms=latency,
            model=model,
            provider=provider,
        )

    async def structured(
        self,
        messages: list[dict],
        *,
        schema_model: type[BaseModel],
        model: str | None = None,
        temperature: float = 0.1,
        max_tokens: int = 1400,
    ) -> tuple[BaseModel, LLMCallResult]:
        """Return an instance of *schema_model* by prompting the LLM for JSON.

        Falls back to deterministic offline JSON when no API key is available.
        """
        json_hint = _json_hint(schema_model)
        sys_prompt = {
            "role": "system",
            "content": (
                "You are a structured-output assistant.\n"
                "Respond ONLY with a JSON object that matches the schema below.\n"
                "Do not include any prose, markdown fences or commentary.\n\n"
                f"SCHEMA:\n{json_hint}"
            ),
        }
        final_messages = [sys_prompt] + list(messages)
        result = await self.chat(
            final_messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            response_format={"type": "json_object"},
        )
        parsed = _safe_parse_json(result.text)
        try:
            obj = schema_model.model_validate(parsed)
            return obj, result
        except Exception as e:
            log.warning("Structured parse failed: {} — attempting salvage", e)
            # Best-effort salvage: strip fences and re-parse
            salvaged = _safe_parse_json(_strip_fences(result.text))
            obj = schema_model.model_validate(salvaged)
            return obj, result


@lru_cache
def get_llm_gateway() -> LLMGateway:
    return LLMGateway()


# ─── helpers ──────────────────────────────────────────────────────────────────

@lru_cache
def _token_encoder():
    """cl100k_base tiktoken encoder (used by GPT-4o family). None if tiktoken
    isn't installed — we then fall back to a char heuristic."""
    try:
        import tiktoken

        return tiktoken.get_encoding("cl100k_base")
    except Exception:
        return None


def _approx_tokens(text: str) -> int:
    if not text:
        return 0
    enc = _token_encoder()
    if enc is not None:
        try:
            return len(enc.encode(text))
        except Exception:
            pass
    return max(1, len(text) // 4)


def _count_messages_tokens(messages: list[dict], reply: str) -> int:
    total = _approx_tokens(reply)
    for m in messages:
        total += _approx_tokens(str(m.get("content", "")))
    return total


def _strip_fences(text: str) -> str:
    m = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if m:
        return m.group(1).strip()
    return text.strip()


def _safe_parse_json(text: str) -> dict:
    text = text.strip()
    if not text:
        return {}
    try:
        return json.loads(text)
    except Exception:
        text = _strip_fences(text)
        # try to find first { .. last }
        i = text.find("{")
        j = text.rfind("}")
        if i >= 0 and j > i:
            try:
                return json.loads(text[i : j + 1])
            except Exception:
                pass
    return {}


def _json_hint(model: type[BaseModel]) -> str:
    """Compact JSON schema hint suitable for a prompt."""
    schema = model.model_json_schema()
    return json.dumps(schema, indent=2)


def _offline_completion(messages: list[dict], response_format: dict | None) -> str:
    """Deterministic offline fallback.

    Produces JSON when JSON mode is requested; otherwise a short natural
    language stub that mirrors the last user message. Used only when the
    OpenRouter key is not configured, so the app can still be demoed end-to-end.
    """
    last_user = next(
        (m["content"] for m in reversed(messages) if m.get("role") == "user"),
        "",
    )
    last_system = next(
        (m["content"] for m in messages if m.get("role") == "system"), ""
    )

    if response_format and response_format.get("type") == "json_object":
        # Try to detect schema-like intent from the system prompt
        stub = _guess_offline_json(last_system, last_user)
        return json.dumps(stub)

    # Plain-text stub
    if not last_user:
        return "OK."
    trim = last_user.strip()[:200]
    return (
        f"Grounded response (offline mode): {trim}\n\n"
        "Set OPENROUTER_API_KEY in .env to enable live model responses."
    )


def _guess_offline_json(system: str, user: str) -> dict:
    """Best-effort minimal JSON that satisfies most agent schemas."""
    text = (system + " " + user).lower()

    if "objectives" in text or "planner" in text:
        return {
            "objectives": [
                {"topic": "Definition", "why": "Establish scope"},
                {"topic": "Evidence", "why": "Ground claims in sources"},
                {"topic": "Risks", "why": "Highlight tradeoffs"},
                {"topic": "Applications", "why": "Concrete uses"},
                {"topic": "Future", "why": "Where the field is going"},
            ],
            "queries": [
                user.strip() or "core concept overview",
                "supporting evidence and citations",
                "risks and limitations",
            ],
        }
    if "curator" in text or "select" in text:
        return {"selected_ids": []}
    if "analyst" in text or "finding" in text:
        return {
            "findings": [
                {
                    "claim": "Structured, evidence-backed research is more trustworthy than free-form chat.",
                    "detail": "Multi-agent RAG pipelines separate retrieval from generation and cite every claim.",
                    "confidence": 0.9,
                    "citation_ids": [],
                }
            ],
            "contradictions": [],
            "recommendations": [
                "Instrument every agent with structured telemetry.",
                "Prefer provider-agnostic gateways.",
            ],
            "follow_up_questions": [
                "How do validator agents affect hallucination rates?",
            ],
            "executive_summary": (
                "Researo synthesises library evidence into an evidence-first report."
            ),
            "methodology": (
                "Planner → Retriever → Ranker → Curator → Analyst → Validator → Publisher."
            ),
        }
    if "validator" in text or "verify" in text:
        return {"issues": [], "confidence": 0.9}
    return {}
