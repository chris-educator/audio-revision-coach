"""Provider-agnostic completions for marking suggestions."""

from __future__ import annotations

import json
import re
from typing import Any

from google import genai
from google.genai.types import GenerateContentConfig

from src.config import GEMINI_MODEL, get_google_api_key
from src.gemini_safety import classroom_gemini_safety_settings
from src.gemini_usage import usage_from_response
from src.llm_config import get_anthropic_api_key, get_llm_model, get_llm_provider
from src.llm_usage import LlmUsage


def extract_json_text(raw: str) -> str:
    text = raw.strip()
    if not text.startswith("```"):
        return text
    lines = text.split("\n")
    if lines[0].startswith("```"):
        lines = lines[1:]
    if lines and lines[-1].strip() == "```":
        lines = lines[:-1]
    return "\n".join(lines).strip()


def _usage_from_gemini(response: Any, *, operation: str) -> LlmUsage | None:
    gemini_usage = usage_from_response(response, operation=operation)
    if gemini_usage is None:
        return None
    return LlmUsage(
        prompt_tokens=gemini_usage.prompt_tokens,
        candidates_tokens=gemini_usage.candidates_tokens,
        total_tokens=gemini_usage.total_tokens,
        operation=operation,
        provider="gemini",
        model=get_llm_model(),
    )


def _call_anthropic(
    *,
    system_instruction: str,
    user_content: str,
    max_output_tokens: int,
    operation: str,
    temperature: float,
) -> tuple[str, LlmUsage | None]:
    import anthropic

    api_key = get_anthropic_api_key()
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not configured on the server.")

    client = anthropic.Anthropic(api_key=api_key)
    response = client.messages.create(
        model=get_llm_model(),
        max_tokens=max_output_tokens,
        temperature=temperature,
        system=system_instruction,
        messages=[{"role": "user", "content": user_content}],
    )
    parts: list[str] = []
    for block in response.content:
        if getattr(block, "type", None) == "text":
            parts.append(block.text)
    raw_text = "".join(parts).strip()
    if not raw_text:
        raise ValueError("Anthropic API response did not include text content.")
    usage_meta = response.usage
    return raw_text, LlmUsage(
        prompt_tokens=int(usage_meta.input_tokens),
        candidates_tokens=int(usage_meta.output_tokens),
        total_tokens=int(usage_meta.input_tokens) + int(usage_meta.output_tokens),
        operation=operation,
        provider="anthropic",
        model=get_llm_model(),
    )


def _call_gemini(
    *,
    system_instruction: str,
    user_content: str,
    max_output_tokens: int,
    operation: str,
    temperature: float,
    json_mode: bool,
) -> tuple[str, LlmUsage | None]:
    api_key = get_google_api_key()
    if not api_key:
        raise RuntimeError("GOOGLE_API_KEY is not configured on the server.")

    client = genai.Client(api_key=api_key)
    model = get_llm_model() if get_llm_provider() == "gemini" else GEMINI_MODEL
    config_kwargs: dict[str, Any] = {
        "system_instruction": system_instruction,
        "temperature": temperature,
        "max_output_tokens": max_output_tokens,
        "safety_settings": classroom_gemini_safety_settings(),
    }
    if json_mode:
        config_kwargs["response_mime_type"] = "application/json"
    result = client.models.generate_content(
        model=model,
        config=GenerateContentConfig(**config_kwargs),
        contents=user_content,
    )
    raw_text = result.text
    if not raw_text:
        raise ValueError("Gemini API response did not include text content.")
    return raw_text, _usage_from_gemini(result, operation=operation)


def generate_text(
    *,
    system_instruction: str,
    user_content: str,
    max_output_tokens: int,
    operation: str = "",
    temperature: float = 0.3,
) -> tuple[str, LlmUsage | None]:
    if get_llm_provider() == "anthropic":
        return _call_anthropic(
            system_instruction=system_instruction,
            user_content=user_content,
            max_output_tokens=max_output_tokens,
            operation=operation,
            temperature=temperature,
        )
    return _call_gemini(
        system_instruction=system_instruction,
        user_content=user_content,
        max_output_tokens=max_output_tokens,
        operation=operation,
        temperature=temperature,
        json_mode=False,
    )


def generate_json_text(
    *,
    system_instruction: str,
    user_content: str,
    max_output_tokens: int,
    operation: str = "",
    temperature: float = 0.2,
) -> tuple[str, LlmUsage | None]:
    if get_llm_provider() == "anthropic":
        return _call_anthropic(
            system_instruction=system_instruction,
            user_content=user_content,
            max_output_tokens=max_output_tokens,
            operation=operation,
            temperature=temperature,
        )
    return _call_gemini(
        system_instruction=system_instruction,
        user_content=user_content,
        max_output_tokens=max_output_tokens,
        operation=operation,
        temperature=temperature,
        json_mode=True,
    )


def parse_json_object(raw_text: str) -> dict[str, Any]:
    cleaned = extract_json_text(raw_text)
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        match = re.search(r"\{[\s\S]*\}", cleaned)
        if match:
            try:
                data = json.loads(match.group(0))
            except json.JSONDecodeError:
                raise ValueError(f"LLM returned invalid JSON: {exc.msg}") from exc
        else:
            raise ValueError(f"LLM returned invalid JSON: {exc.msg}") from exc
    if not isinstance(data, dict):
        raise ValueError("LLM JSON payload must be an object.")
    return data
