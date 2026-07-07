"""Load revision topic presets."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

TOPICS_PATH = Path(__file__).resolve().parent / "topics.json"


@lru_cache(maxsize=1)
def load_topics() -> list[dict[str, Any]]:
    with TOPICS_PATH.open(encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, list):
        raise ValueError("Revision topics must be a JSON array.")
    return data


def list_topics() -> list[dict[str, Any]]:
    return load_topics()


def get_topic(topic_id: str) -> dict[str, Any] | None:
    for topic in load_topics():
        if topic.get("id") == topic_id:
            return topic
    return None
