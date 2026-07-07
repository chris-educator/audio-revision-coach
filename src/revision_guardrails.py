"""Validate revision AI outputs."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, field_validator


class FlashcardItem(BaseModel):
    front: str = Field(min_length=8, max_length=300)
    back: str = Field(min_length=15, max_length=600)


class RevisionDeckOutput(BaseModel):
    topic_title: str = Field(min_length=4, max_length=200)
    deck_intro: str = Field(min_length=20, max_length=800)
    cards: list[FlashcardItem] = Field(min_length=8, max_length=20)
    study_tip: str = Field(min_length=10, max_length=400)
    integrity_note: str = Field(min_length=20, max_length=400)


class ScriptSection(BaseModel):
    heading: str = Field(min_length=4, max_length=120)
    script: str = Field(min_length=40, max_length=1200)


class RevisionScriptOutput(BaseModel):
    topic_title: str = Field(min_length=4, max_length=200)
    estimated_minutes: float = Field(ge=2, le=15)
    sections: list[ScriptSection] = Field(min_length=3, max_length=8)
    recap_questions: list[str] = Field(min_length=2, max_length=5)
    integrity_note: str = Field(min_length=20, max_length=400)

    @field_validator("recap_questions")
    @classmethod
    def strip_questions(cls, value: list[str]) -> list[str]:
        cleaned = [item.strip() for item in value if item.strip()]
        if len(cleaned) < 2:
            raise ValueError("At least two recap questions required")
        return cleaned


def validate_deck(raw: dict[str, Any]) -> tuple[dict[str, Any] | None, str | None]:
    try:
        output = RevisionDeckOutput.model_validate(raw)
    except Exception as exc:
        return None, f"Invalid deck JSON: {exc}"
    return output.model_dump(), None


def validate_script(raw: dict[str, Any]) -> tuple[dict[str, Any] | None, str | None]:
    try:
        output = RevisionScriptOutput.model_validate(raw)
    except Exception as exc:
        return None, f"Invalid script JSON: {exc}"
    return output.model_dump(), None
