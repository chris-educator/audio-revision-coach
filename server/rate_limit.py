"""Lightweight in-process rate limiting for public and auth endpoints."""

from __future__ import annotations

import os
import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request


def rate_limiting_enabled() -> bool:
    return os.getenv("RATE_LIMIT_ENABLED", "true").strip().lower() not in (
        "0",
        "false",
        "no",
        "off",
    )


def _client_ip(request: Request) -> str:
    cf = request.headers.get("cf-connecting-ip", "").strip()
    if cf:
        return cf
    real_ip = request.headers.get("x-real-ip", "").strip()
    if real_ip:
        return real_ip
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        hops = [hop.strip() for hop in forwarded.split(",") if hop.strip()]
        if hops:
            return hops[-1]
    client = request.client
    return client.host if client else "unknown"


class _SlidingWindowLimiter:
    _MAX_KEYS = 50_000

    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def allow(self, key: str, *, limit: int, window_seconds: float) -> bool:
        if limit <= 0:
            return True
        now = time.monotonic()
        cutoff = now - window_seconds
        with self._lock:
            if len(self._hits) > self._MAX_KEYS:
                self._purge(cutoff)
            hits = self._hits[key]
            while hits and hits[0] < cutoff:
                hits.popleft()
            if len(hits) >= limit:
                return False
            hits.append(now)
            return True

    def _purge(self, cutoff: float) -> None:
        stale = [k for k, dq in self._hits.items() if not dq or dq[-1] < cutoff]
        for k in stale:
            self._hits.pop(k, None)


_LIMITER = _SlidingWindowLimiter()

_DEFAULTS: dict[str, tuple[int, int]] = {
    "auth": (10, 300),
    "extract": (30, 3600),
    "generate": (24, 3600),
    "export": (60, 3600),
    "research": (24, 3600),
    "assistant": (40, 300),
}


def _limit_for(bucket: str, default_limit: int, default_window: int) -> tuple[int, int]:
    prefix = f"RATE_LIMIT_{bucket.upper()}"
    try:
        limit = int(os.getenv(f"{prefix}_MAX", str(default_limit)))
    except ValueError:
        limit = default_limit
    try:
        window = int(os.getenv(f"{prefix}_WINDOW", str(default_window)))
    except ValueError:
        window = default_window
    return limit, window


def enforce(request: Request, bucket: str) -> None:
    if not rate_limiting_enabled():
        return
    default_limit, default_window = _DEFAULTS.get(bucket, (60, 300))
    limit, window = _limit_for(bucket, default_limit, default_window)
    try:
        allowed = _LIMITER.allow(
            f"{bucket}:{_client_ip(request)}",
            limit=limit,
            window_seconds=window,
        )
    except Exception:
        return
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please wait a moment and try again.",
        )


def enforce_rate_limit(request: Request, *, bucket: str) -> None:
    enforce(request, bucket)


def client_ip(request: Request) -> str:
    return _client_ip(request)
