"""Tests for LLM configuration."""

from src.llm_config import get_llm_model, get_llm_provider, is_llm_configured


def test_provider_defaults_to_anthropic_when_key_set(monkeypatch):
    monkeypatch.delenv("LLM_PROVIDER", raising=False)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    assert get_llm_provider() == "anthropic"
    assert get_llm_model() == "claude-sonnet-4-6"
    assert is_llm_configured() is True


def test_generate_json_text_falls_back_to_gemini(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")
    monkeypatch.setenv("GOOGLE_API_KEY", "google-test-key")
    monkeypatch.delenv("LLM_PROVIDER", raising=False)

    calls: list[str] = []

    def fake_anthropic(**kwargs):
        calls.append("anthropic")
        raise RuntimeError("anthropic down")

    def fake_gemini(**kwargs):
        calls.append("gemini")
        return '{"cards": [{"front": "Q", "back": "A"}]}', None

    monkeypatch.setattr("src.llm_chat._call_anthropic", fake_anthropic)
    monkeypatch.setattr("src.llm_chat._call_gemini", fake_gemini)

    from src.llm_chat import generate_json_text

    text, _usage = generate_json_text(
        system_instruction="test",
        user_content="Generate a deck.",
        max_output_tokens=256,
        operation="revision_deck",
    )
    assert calls == ["anthropic", "gemini"]
    assert "cards" in text
