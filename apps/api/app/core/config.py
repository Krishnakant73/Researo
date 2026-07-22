"""Application configuration loaded from environment variables."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def mask_secret(value: str | None, *, visible_prefix: int = 6) -> str:
    """Return a safe, masked form of a secret for display/observability.

    Reveals only a short, non-sensitive prefix (e.g. the universal ``sk-or-``
    prefix shared by every OpenRouter key) followed by bullets — never the
    secret portion. Returns "" when unset. NEVER log or return the raw value.
    """
    if not value:
        return ""
    if len(value) <= visible_prefix + 4:
        return "•" * 8
    return f"{value[:visible_prefix]}{'•' * 8}"


class Settings(BaseSettings):
    """Runtime configuration for the Researo API.

    Values are pulled from the process environment (or `.env` file at repo root of
    the api app). All paths default to sensible locations inside the api app dir.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "development"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: str = "http://localhost:3000"

    # Storage roots
    project_root: Path = Field(default_factory=lambda: Path(__file__).resolve().parents[2])
    upload_dir: str = "./uploads"
    max_upload_size_mb: int = 50

    # Database
    database_url: str = "sqlite+aiosqlite:///./data/researo.db"

    def resolved_database_url(self) -> str:
        """Return a driver-correct DB URL.

        - Postgres URLs from Railway/Heroku (`postgres://` / `postgresql://`) are
          upgraded to the async `postgresql+asyncpg://` driver, and libpq-style
          `sslmode` query params (which asyncpg rejects) are stripped.
        - Relative sqlite paths are resolved to the project root so the app is
          invariant of the launch CWD and the parent dir exists.
        """
        url = self.database_url
        if url.startswith("postgres://") or url.startswith("postgresql://"):
            _, _, rest = url.partition("://")
            url = f"postgresql+asyncpg://{rest}"
            for frag in (
                "?sslmode=require",
                "&sslmode=require",
                "?sslmode=disable",
                "&sslmode=disable",
                "?sslmode=prefer",
                "&sslmode=prefer",
            ):
                url = url.replace(frag, "")
            return url
        if url.startswith("sqlite"):
            marker = "///"
            if marker in url:
                prefix, _, raw = url.partition(marker)
                p = Path(raw)
                if not p.is_absolute():
                    p = (self.project_root / raw).resolve()
                p.parent.mkdir(parents=True, exist_ok=True)
                return f"{prefix}///{p.as_posix()}"
        return url

    # Vector store
    # Which VectorStore implementation to use. "chroma" is the production
    # default; "numpy" is a dependency-free fallback used automatically when
    # chromadb can't be imported/initialised (kept so the app never hard-fails).
    vector_backend: str = "chroma"
    chroma_persist_dir: str = "./chroma_store"
    chroma_collection: str = "researo_chunks"

    # Embeddings / reranking providers (pluggable behind interfaces)
    embedding_provider: str = "bge"  # "bge" (sentence-transformers) | "hash"
    reranker_backend: str = "cross-encoder"  # "cross-encoder" | "none"
    reranker_model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"

    # LLM Gateway
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"

    @property
    def openrouter_key_masked(self) -> str:
        """Masked key for status output — safe to expose, reveals no secret."""
        return mask_secret(self.openrouter_api_key)
    default_model: str = "openai/gpt-4o-mini"
    fast_model: str = "openai/gpt-4o-mini"
    quality_model: str = "openai/gpt-4o"

    # Embeddings
    embedding_model: str = "BAAI/bge-small-en-v1.5"
    embedding_dim: int = 384
    use_local_embeddings: bool = True

    # Retrieval
    top_k_dense: int = 12
    top_k_bm25: int = 12
    top_k_final: int = 8

    # Derived
    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def upload_path(self) -> Path:
        p = (self.project_root / self.upload_dir).resolve() if not Path(self.upload_dir).is_absolute() else Path(self.upload_dir)
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def chroma_path(self) -> Path:
        p = (self.project_root / self.chroma_persist_dir).resolve() if not Path(self.chroma_persist_dir).is_absolute() else Path(self.chroma_persist_dir)
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def db_path(self) -> Path:
        # Ensure sqlite folder exists
        if self.database_url.startswith("sqlite"):
            # Extract path portion after "///"
            marker = "///"
            if marker in self.database_url:
                raw = self.database_url.split(marker, 1)[1]
                p = Path(raw)
                if not p.is_absolute():
                    p = (self.project_root / p).resolve()
                p.parent.mkdir(parents=True, exist_ok=True)
                return p
        return self.project_root / "data" / "researo.db"


@lru_cache
def get_settings() -> Settings:
    return Settings()
