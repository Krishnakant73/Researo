"""Structured logging using loguru."""
from __future__ import annotations

import sys

from loguru import logger

_configured = False


def configure_logging() -> None:
    """Configure loguru once per process."""
    global _configured
    if _configured:
        return
    logger.remove()
    logger.add(
        sys.stdout,
        colorize=True,
        format=(
            "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
            "<level>{level: <8}</level> | "
            "<cyan>{name}:{function}:{line}</cyan> - <level>{message}</level>"
        ),
        level="INFO",
    )
    _configured = True


def get_logger(name: str | None = None):
    configure_logging()
    return logger.bind(module=name) if name else logger
