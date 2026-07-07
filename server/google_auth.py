"""Google OAuth 2.0 (authorization code) for Data Explorer sign-in."""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import secrets
import time
import urllib.error
import urllib.parse
import urllib.request

from fastapi import HTTPException
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

STATE_TTL_SECONDS = 600
STATE_COOKIE = "de_google_oauth_state"


def google_oauth_configured() -> bool:
    return bool(_client_id() and _client_secret())


def _client_id() -> str:
    return os.getenv("GOOGLE_OAUTH_CLIENT_ID", "").strip()


def _client_secret() -> str:
    return os.getenv("GOOGLE_OAUTH_CLIENT_SECRET", "").strip()


def oauth_redirect_uri() -> str:
    base = os.getenv("APP_PUBLIC_URL", "http://127.0.0.1:8007").rstrip("/")
    return f"{base}/api/auth/google/callback"


def _state_secret() -> str:
    from server import billing

    secret = billing._auth_secret()
    if not secret:
        raise HTTPException(status_code=503, detail="AUTH_SECRET is not configured.")
    return secret


def make_oauth_state() -> str:
    nonce = secrets.token_urlsafe(16)
    exp = int(time.time()) + STATE_TTL_SECONDS
    payload = f"{nonce}.{exp}"
    sig = hmac.new(
        _state_secret().encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"{payload}.{sig}"


def verify_oauth_state(state: str) -> bool:
    if not state or state.count(".") != 2:
        return False
    payload, sig = state.rsplit(".", 1)
    expected = hmac.new(
        _state_secret().encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, sig):
        return False
    try:
        _nonce, exp_raw = payload.split(".", 1)
        exp = int(exp_raw)
    except ValueError:
        return False
    return exp >= int(time.time())


def authorization_url(state: str) -> str:
    client_id = _client_id()
    if not client_id:
        raise HTTPException(status_code=503, detail="Google sign-in is not configured.")
    params = {
        "client_id": client_id,
        "redirect_uri": oauth_redirect_uri(),
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    }
    return f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"


def exchange_code_for_user(code: str) -> dict[str, str | bool]:
    client_id = _client_id()
    client_secret = _client_secret()
    if not client_id or not client_secret:
        raise HTTPException(status_code=503, detail="Google sign-in is not configured.")

    body = urllib.parse.urlencode(
        {
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": oauth_redirect_uri(),
            "grant_type": "authorization_code",
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        "https://oauth2.googleapis.com/token",
        data=body,
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raise HTTPException(
            status_code=400,
            detail="Google sign-in failed. Try again.",
        ) from exc
    except urllib.error.URLError as exc:
        raise HTTPException(
            status_code=503,
            detail="Could not reach Google sign-in. Try again shortly.",
        ) from exc

    id_token_jwt = str(payload.get("id_token") or "")
    if not id_token_jwt:
        raise HTTPException(status_code=400, detail="Google did not return a valid sign-in token.")

    try:
        claims = id_token.verify_oauth2_token(
            id_token_jwt,
            google_requests.Request(),
            audience=client_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid Google sign-in token.") from exc

    sub = str(claims.get("sub") or "")
    email = str(claims.get("email") or "").strip().lower()
    email_verified = bool(claims.get("email_verified"))
    if not sub or not email:
        raise HTTPException(status_code=400, detail="Google account is missing required profile data.")

    return {
        "google_sub": sub,
        "email": email,
        "email_verified": email_verified,
    }
