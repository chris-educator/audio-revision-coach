"""LLM provider configuration — Anthropic (primary) or Gemini."""

from __future__ import annotations

import os

from src.config import is_google_api_key_configured

_PLACEHOLDER_KEYS = frozenset(
    {
        "",
        "your_anthropic_api_key_here",
        "your-api-key",
        "changeme",
    }
)

DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-6"
DEFAULT_GEMINI_MODEL = "gemini-3.5-flash"


def get_anthropic_api_key() -> str | None:
    raw = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not raw or raw.lower() in _PLACEHOLDER_KEYS:
        return None
    return raw


def is_anthropic_configured() -> bool:
    return get_anthropic_api_key() is not None


def get_llm_provider() -> str:
    explicit = os.getenv("LLM_PROVIDER", "").strip().lower()
    if explicit in ("anthropic", "gemini"):
        return explicit
    if is_anthropic_configured():
        return "anthropic"
    return "gemini"


def get_llm_model() -> str:
    model = os.getenv("LLM_MODEL", "").strip()
    if model:
        return model
    if get_llm_provider() == "anthropic":
        return DEFAULT_ANTHROPIC_MODEL
    return os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL).strip() or DEFAULT_GEMINI_MODEL


def is_llm_configured() -> bool:
    if get_llm_provider() == "anthropic":
        return is_anthropic_configured()
    return is_google_api_key_configured()
