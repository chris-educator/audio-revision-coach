"""Optional Sentry error reporting — enabled when SENTRY_DSN is set."""

from __future__ import annotations

import os


def init_sentry(*, service_name: str) -> None:
    dsn = os.getenv("SENTRY_DSN", "").strip()
    if not dsn:
        return

    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration
    except ImportError:
        return

    environment = os.getenv("SENTRY_ENVIRONMENT", "").strip() or None
    release = os.getenv("SENTRY_RELEASE", "").strip() or None
    traces_sample_rate = 0.0
    try:
        traces_sample_rate = float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0"))
    except ValueError:
        traces_sample_rate = 0.0

    sentry_sdk.init(
        dsn=dsn,
        environment=environment,
        release=release,
        integrations=[
            StarletteIntegration(transaction_style="endpoint"),
            FastApiIntegration(transaction_style="endpoint"),
        ],
        traces_sample_rate=max(0.0, min(1.0, traces_sample_rate)),
        send_default_pii=False,
        before_send=_scrub_event,
    )
    sentry_sdk.set_tag("service", service_name)


def _scrub_event(event, hint):
    """Drop events that might contain source text in request bodies."""
    request = event.get("request") or {}
    data = request.get("data")
    if isinstance(data, str) and len(data) > 500:
        request["data"] = "[truncated — may contain source text or lesson payload]"
        event["request"] = request
    return event
