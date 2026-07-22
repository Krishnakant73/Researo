"""Rough LLM cost estimation from token counts.

Blended $/1M-token rates by model family. Estimates only — surfaced clearly as
"est." in the UI and stored on ModelUsage for analytics.
"""
from __future__ import annotations


def rate_per_million(model: str | None) -> float:
    m = (model or "").lower()
    if not m or "hybrid" in m or "heuristic" in m or "local" in m:
        return 0.0
    if "gpt-4o-mini" in m:
        return 0.45
    if "gpt-4o" in m:
        return 6.25
    if "claude" in m and "haiku" in m:
        return 1.6
    if "claude" in m:
        return 9.0
    if "gemini" in m and "flash" in m:
        return 0.4
    if "gemini" in m:
        return 3.5
    if "mistral" in m:
        return 1.0
    if "llama" in m:
        return 0.7
    return 1.5


def agent_cost(model: str | None, tokens: int) -> float:
    if not tokens:
        return 0.0
    return (tokens / 1_000_000) * rate_per_million(model)


def provider_of(model: str | None) -> str:
    m = (model or "").lower()
    if "/" in m:
        return m.split("/", 1)[0]
    if "gpt" in m or "openai" in m:
        return "openai"
    if "claude" in m:
        return "anthropic"
    if "gemini" in m:
        return "google"
    if "hybrid" in m:
        return "local"
    if "heuristic" in m:
        return "local"
    return "unknown"
