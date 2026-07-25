"""App configuration."""

from __future__ import annotations

import os

_PLACEHOLDER_KEYS = frozenset({"", "your_google_api_key_here", "your-api-key", "changeme"})


def get_google_api_key() -> str | None:
    raw = os.getenv("GOOGLE_API_KEY", "").strip()
    if not raw or raw.lower() in _PLACEHOLDER_KEYS:
        return None
    return raw


def is_google_api_key_configured() -> bool:
    return get_google_api_key() is not None


GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash").strip()
MAX_GENERATION_ATTEMPTS = 3
MIN_SOURCE_CHARS = 200
MAX_SOURCE_CHARS = 50_000

# Hard caps on Gemini output — prevents runaway token bills.
GEMINI_MAX_OUTPUT_TOKENS_PRACTICE = max(
    1024, int(os.getenv("GEMINI_MAX_OUTPUT_TOKENS_PRACTICE", "4096"))
)
GEMINI_MAX_OUTPUT_TOKENS_ASSISTANT = max(
    128, int(os.getenv("GEMINI_MAX_OUTPUT_TOKENS_ASSISTANT", "512"))
)

MAX_ASSISTANT_MESSAGES = max(1, int(os.getenv("MAX_ASSISTANT_MESSAGES", "40")))
MAX_ASSISTANT_MESSAGE_CHARS = max(
    256, int(os.getenv("MAX_ASSISTANT_MESSAGE_CHARS", "4000"))
)
MAX_REQUEST_BYTES = max(1024, int(os.getenv("MAX_REQUEST_BYTES", "15000000")))
