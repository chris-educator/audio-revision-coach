"""HTTP client for the EdStack shared billing service (account.appstax.ai)."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

import jwt
from fastapi import HTTPException, Request, Response

from server import billing as local_billing

DEFAULT_SESSION_COOKIE = "edstack_session"
DEFAULT_TIMEOUT = 15.0


def enabled() -> bool:
    return bool(service_url())


def service_url() -> str:
    return os.getenv("EDSTACK_BILLING_URL", "").strip().rstrip("/")


def app_id() -> str:
    explicit = os.getenv("EDSTACK_APP_ID", "").strip()
    if explicit:
        return explicit
    public = os.getenv("APP_PUBLIC_URL", "").strip().lower()
    if "feedback." in public:
        return "feedback-generator"
    if "data." in public:
        return "data-explorer"
    return "edstack-app"


def session_cookie_name() -> str:
    if not enabled():
        return local_billing.SESSION_COOKIE
    return os.getenv("EDSTACK_SESSION_COOKIE", DEFAULT_SESSION_COOKIE).strip() or DEFAULT_SESSION_COOKIE


def session_cookie_domain() -> str | None:
    raw = os.getenv("SESSION_COOKIE_DOMAIN", "").strip()
    return raw or None


def _service_secret() -> str:
    secret = os.getenv("EDSTACK_BILLING_SERVICE_SECRET", "").strip()
    if not secret:
        raise HTTPException(
            status_code=503,
            detail="EDSTACK_BILLING_SERVICE_SECRET is not configured.",
        )
    return secret


def _app_public_url() -> str:
    return os.getenv("APP_PUBLIC_URL", "http://127.0.0.1:8007").rstrip("/")


def _request(
    method: str,
    path: str,
    *,
    payload: dict[str, Any] | None = None,
    query: dict[str, str] | None = None,
) -> Any:
    base = service_url()
    url = f"{base}{path}"
    if query:
        url = f"{url}?{urllib.parse.urlencode(query)}"
    data = None
    headers = {
        "Authorization": f"Bearer {_service_secret()}",
        "Accept": "application/json",
    }
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=DEFAULT_TIMEOUT) as resp:
            body = resp.read().decode("utf-8")
            if not body:
                return {}
            return json.loads(body)
    except urllib.error.HTTPError as exc:
        detail = "Billing service request failed."
        try:
            parsed = json.loads(exc.read().decode("utf-8"))
            if isinstance(parsed, dict) and parsed.get("detail"):
                detail = str(parsed["detail"])
        except (json.JSONDecodeError, UnicodeDecodeError):
            pass
        raise HTTPException(status_code=exc.code, detail=detail) from exc
    except urllib.error.URLError as exc:
        raise HTTPException(
            status_code=503,
            detail="Could not reach the EdStack billing service. Try again shortly.",
        ) from exc


def _user_from_payload(data: dict[str, Any]) -> local_billing.UserRow:
    return local_billing.UserRow(
        id=str(data["user_id"]),
        email=str(data["email"]),
        credits=int(data.get("credits") or 0),
        email_verified=bool(data.get("email_verified", True)),
    )


def _jwt_user_id(request: Request) -> str | None:
    secret = local_billing._auth_secret()
    if not secret:
        return None
    token = request.cookies.get(session_cookie_name())
    if not token:
        return None
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None
    user_id = str(payload.get("sub") or "")
    return user_id or None


def ensure_db() -> None:
    return None


def database_ready() -> bool:
    try:
        data = _request("GET", "/api/health")
        return bool(data.get("billing_database_ready"))
    except HTTPException:
        return False


def database_path_display() -> str:
    return f"remote:{service_url()}"


def register_user(email: str, password: str) -> local_billing.RegisterResult:
    data = _request(
        "POST",
        "/api/internal/auth/register",
        payload={
            "email": email,
            "password": password,
            "app_public_url": _app_public_url(),
        },
    )
    user = _user_from_payload(data)
    return local_billing.RegisterResult(
        user=user,
        needs_email_verification=bool(data.get("needs_email_verification")),
    )


def authenticate_user(email: str, password: str) -> local_billing.UserRow:
    data = _request(
        "POST",
        "/api/internal/auth/login",
        payload={"email": email, "password": password},
    )
    return _user_from_payload(data)


def verify_email_token(token: str) -> local_billing.UserRow:
    data = _request(
        "POST",
        "/api/internal/auth/verify-email",
        payload={"token": token},
    )
    return _user_from_payload(data)


def resend_verification_email(email: str) -> None:
    _request(
        "POST",
        "/api/internal/auth/resend-verification",
        payload={"email": email},
    )


def find_or_create_google_user(
    *,
    google_sub: str,
    email: str,
    email_verified: bool,
) -> local_billing.UserRow:
    data = _request(
        "POST",
        "/api/internal/google-user",
        payload={
            "google_sub": google_sub,
            "email": email,
            "email_verified": email_verified,
        },
    )
    return _user_from_payload(data)


def user_from_request(request: Request) -> local_billing.UserRow | None:
    user_id = _jwt_user_id(request)
    if not user_id:
        return None
    data = _request("GET", f"/api/internal/user/{user_id}")
    return _user_from_payload(data)


def debit_credits(user_id: str, amount: int, *, reason: str) -> int:
    data = _request(
        "POST",
        "/api/internal/debit",
        payload={
            "user_id": user_id,
            "amount": amount,
            "reason": reason,
            "app_id": app_id(),
        },
    )
    return int(data["credits"])


def add_credits(user_id: str, amount: int, *, reason: str) -> int:
    data = _request(
        "POST",
        "/api/internal/credit",
        payload={
            "user_id": user_id,
            "amount": amount,
            "reason": reason,
            "app_id": app_id(),
        },
    )
    return int(data["credits"])


def log_usage(
    *,
    user_id: str | None,
    usages: list[dict[str, Any]],
    credits_charged: int,
) -> None:
    for entry in usages:
        _request(
            "POST",
            "/api/internal/log-usage",
            payload={
                "user_id": user_id,
                "operation": str(entry.get("operation") or "unknown"),
                "prompt_tokens": int(entry.get("prompt_tokens") or 0),
                "candidates_tokens": int(entry.get("candidates_tokens") or 0),
                "total_tokens": int(entry.get("total_tokens") or 0),
                "credits_charged": credits_charged,
                "app_id": app_id(),
            },
        )


def create_checkout_session(user: local_billing.UserRow, pack_id: str) -> dict[str, str]:
    return _request(
        "POST",
        "/api/internal/billing/checkout",
        payload={
            "user_id": user.id,
            "pack_id": pack_id,
            "app_public_url": _app_public_url(),
        },
    )


def fulfill_checkout_session(user: local_billing.UserRow, session_id: str) -> dict[str, Any]:
    return _request(
        "POST",
        "/api/internal/billing/fulfill-checkout",
        payload={"user_id": user.id, "session_id": session_id},
    )


def handle_stripe_webhook(payload: bytes, signature: str) -> None:
    raise HTTPException(
        status_code=503,
        detail="Stripe webhooks are handled by the EdStack billing service only.",
    )


def set_session_cookie(response: Response, token: str) -> None:
    secure = local_billing.cookie_secure()
    domain = session_cookie_domain()
    kwargs: dict[str, Any] = {
        "key": session_cookie_name(),
        "value": token,
        "httponly": True,
        "secure": secure,
        "samesite": "lax",
        "max_age": local_billing.session_max_age_seconds(),
        "path": "/",
    }
    if domain:
        kwargs["domain"] = domain
    response.set_cookie(**kwargs)


def clear_session_cookie(response: Response) -> None:
    domain = session_cookie_domain()
    kwargs: dict[str, Any] = {
        "key": session_cookie_name(),
        "path": "/",
        "secure": local_billing.cookie_secure(),
        "samesite": "lax",
        "httponly": True,
    }
    if domain:
        kwargs["domain"] = domain
    response.delete_cookie(**kwargs)
