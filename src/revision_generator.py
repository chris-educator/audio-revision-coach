"""Generate flashcard decks and listen-aloud revision scripts."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from src.config import GEMINI_MAX_OUTPUT_TOKENS_PRACTICE, MAX_GENERATION_ATTEMPTS
from src.llm_chat import generate_json_text, parse_json_object
from src.llm_config import is_llm_configured
from src.llm_usage import LlmUsage
from src.revision.catalog import get_topic
from src.revision_guardrails import validate_deck, validate_script
from src.revision_prompts import REVISION_DECK_SYSTEM, REVISION_SCRIPT_SYSTEM


@dataclass
class RevisionResult:
    payload: dict[str, Any] = field(default_factory=dict)
    error: str | None = None
    usage: LlmUsage | None = None


def _topic_context(*, topic_id: str, custom_topic: str, year_level: str, subject: str) -> str:
    preset = get_topic(topic_id) if topic_id else None
    title = preset["title"] if preset else custom_topic.strip()
    subj = preset["subject"] if preset else subject.strip()
    summary = preset.get("summary", "") if preset else ""
    return f"""Topic: {title}
Subject: {subj or 'General'}
Year level: {year_level.strip() or 'Secondary'}
Focus: {summary or custom_topic.strip() or title}
"""


def generate_revision_deck(
    *,
    topic_id: str = "",
    custom_topic: str = "",
    year_level: str = "",
    subject: str = "",
) -> RevisionResult:
    if not is_llm_configured():
        return RevisionResult(error="Primary LLM is not configured on the server.")
    if not topic_id and len(custom_topic.strip()) < 3:
        return RevisionResult(error="Select a topic or enter at least 3 characters.")

    prompt = (
        _topic_context(
            topic_id=topic_id,
            custom_topic=custom_topic,
            year_level=year_level,
            subject=subject,
        )
        + "\nGenerate 10–14 flashcards for exam revision."
    )

    last_error = "Deck generation failed."
    for _attempt in range(MAX_GENERATION_ATTEMPTS):
        try:
            raw_text, usage = generate_json_text(
                system_instruction=REVISION_DECK_SYSTEM,
                user_content=prompt,
                max_output_tokens=GEMINI_MAX_OUTPUT_TOKENS_PRACTICE,
                operation="revision_deck",
                temperature=0.35,
            )
            parsed = parse_json_object(raw_text)
            validated, err = validate_deck(parsed)
            if err:
                last_error = err
                continue
            return RevisionResult(payload={"deck": validated}, usage=usage)
        except Exception as exc:
            last_error = str(exc)
    return RevisionResult(error=last_error)


def generate_revision_script(
    *,
    topic_id: str = "",
    custom_topic: str = "",
    year_level: str = "",
    subject: str = "",
) -> RevisionResult:
    if not is_llm_configured():
        return RevisionResult(error="Primary LLM is not configured on the server.")
    if not topic_id and len(custom_topic.strip()) < 3:
        return RevisionResult(error="Select a topic or enter at least 3 characters.")

    prompt = (
        _topic_context(
            topic_id=topic_id,
            custom_topic=custom_topic,
            year_level=year_level,
            subject=subject,
        )
        + "\nGenerate a listen-aloud revision script (~5–8 minutes spoken)."
    )

    last_error = "Script generation failed."
    for _attempt in range(MAX_GENERATION_ATTEMPTS):
        try:
            raw_text, usage = generate_json_text(
                system_instruction=REVISION_SCRIPT_SYSTEM,
                user_content=prompt,
                max_output_tokens=GEMINI_MAX_OUTPUT_TOKENS_PRACTICE,
                operation="revision_script",
                temperature=0.35,
            )
            parsed = parse_json_object(raw_text)
            validated, err = validate_script(parsed)
            if err:
                last_error = err
                continue
            return RevisionResult(payload={"script": validated}, usage=usage)
        except Exception as exc:
            last_error = str(exc)
    return RevisionResult(error=last_error)
