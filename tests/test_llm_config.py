"""Tests for LLM configuration."""

from src.llm_config import get_llm_model, get_llm_provider, is_llm_configured


def test_provider_defaults_to_anthropic_when_key_set(monkeypatch):
    monkeypatch.delenv("LLM_PROVIDER", raising=False)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    assert get_llm_provider() == "anthropic"
    assert get_llm_model() == "claude-sonnet-4-20250514"
    assert is_llm_configured() is True
