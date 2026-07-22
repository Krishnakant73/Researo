"""Shared response envelope + error types."""
from __future__ import annotations

from typing import Any, Generic, Optional, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class ApiError(BaseModel):
    code: str
    message: str


class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    data: Optional[T] = None
    error: Optional[ApiError] = None
    message: Optional[str] = None


def ok(data: Any, message: str | None = None) -> dict:
    return {"success": True, "data": data, "message": message}


def fail(code: str, message: str, status: int = 400) -> dict:
    return {"success": False, "error": {"code": code, "message": message}}
