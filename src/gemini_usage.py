"""Extract token usage from Google GenAI responses."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True)
class GeminiUsage:
    prompt_tokens: int
    candidates_tokens: int
    total_tokens: int
    operation: str = ""

    def to_dict(self) -> dict[str, int | str]:
        return asdict(self)


def usage_from_response(response: Any, *, operation: str = "") -> GeminiUsage | None:
    meta = getattr(response, "usage_metadata", None)
    if meta is None:
        return None

    prompt = int(getattr(meta, "prompt_token_count", 0) or 0)
    candidates = int(getattr(meta, "candidates_token_count", 0) or 0)
    total = int(getattr(meta, "total_token_count", 0) or 0)
    if total == 0 and (prompt or candidates):
        total = prompt + candidates
    if prompt == 0 and candidates == 0 and total == 0:
        return None

    return GeminiUsage(
        prompt_tokens=prompt,
        candidates_tokens=candidates,
        total_tokens=total,
        operation=operation,
    )
