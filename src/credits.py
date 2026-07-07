"""Credit costs for Audio Revision Coach."""

from __future__ import annotations

CREDITS_PER_DECK = 3
CREDITS_PER_SCRIPT = 5


def credits_for_deck() -> int:
    return CREDITS_PER_DECK


def credits_for_script() -> int:
    return CREDITS_PER_SCRIPT
