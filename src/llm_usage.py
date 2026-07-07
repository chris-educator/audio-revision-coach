"""Token usage from LLM responses (Anthropic or Gemini)."""

from __future__ import annotations

from dataclasses import asdict, dataclass


@dataclass(frozen=True)
class LlmUsage:
    prompt_tokens: int
    candidates_tokens: int
    total_tokens: int
    operation: str = ""
    provider: str = ""
    model: str = ""

    def to_dict(self) -> dict[str, int | str]:
        return asdict(self)
