"""Convenience runner: `python scripts/run.py` starts the API in dev mode."""
from __future__ import annotations

import uvicorn

from app.core.config import get_settings


def main() -> None:
    s = get_settings()
    uvicorn.run(
        "app.main:app",
        host=s.api_host,
        port=s.api_port,
        reload=True,
        log_level="info",
    )


if __name__ == "__main__":
    main()
