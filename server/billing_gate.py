"""Helpers for billing-gated AI actions."""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException, Request

from server import billing


def charge_or_skip(
    request: Request,
    amount: int,
    *,
    reason: str,
) -> tuple[Any | None, int | None, bool]:
    """Debit credits when billing is enabled; otherwise no-op."""
    if not billing.billing_enabled():
        return None, None, False
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid credit amount.")
    user = billing.require_user(request)
    remaining = billing.debit_credits(user.id, amount, reason=reason)
    return user, remaining, True


def refund(
    user_id: str,
    amount: int,
    *,
    reason: str,
    remaining: int | None,
) -> int | None:
    if amount <= 0 or not billing.billing_enabled():
        return remaining
    billing.add_credits(user_id, amount, reason=reason)
    if remaining is None:
        return None
    return remaining + amount


def attach_credits_fields(
    body: dict[str, Any],
    *,
    user: Any | None,
    charged: int,
    remaining: int | None,
) -> None:
    if billing.billing_enabled() and user is not None and remaining is not None:
        body["credits_charged"] = charged
        body["credits_remaining"] = remaining


def require_signed_in(request: Request) -> None:
    if billing.billing_enabled():
        billing.require_user(request)
