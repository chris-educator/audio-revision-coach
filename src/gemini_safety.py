"""Default Gemini safety settings for classroom-facing generation paths."""

from __future__ import annotations

from google.genai.types import HarmBlockThreshold, HarmCategory, SafetySetting

_CATEGORIES = (
    HarmCategory.HARM_CATEGORY_HARASSMENT,
    HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
)


def classroom_gemini_safety_settings() -> list[SafetySetting]:
    """Block medium-and-above harmful content on lesson generation and assistant calls."""
    return [
        SafetySetting(
            category=category,
            threshold=HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        )
        for category in _CATEGORIES
    ]
