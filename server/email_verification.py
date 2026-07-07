"""Email verification for email/password sign-up (stdlib SMTP)."""

from __future__ import annotations

import hashlib
import logging
import os
import secrets
import smtplib
import urllib.parse
from email.message import EmailMessage

from fastapi import HTTPException

logger = logging.getLogger("data_explorer")

TOKEN_BYTES = 32


def email_verification_enabled() -> bool:
    return os.getenv("EMAIL_VERIFICATION_ENABLED", "true").strip().lower() not in (
        "0",
        "false",
        "no",
        "off",
    )


def smtp_configured() -> bool:
    return bool(os.getenv("SMTP_HOST", "").strip())


def verification_ttl_hours() -> int:
    try:
        return max(1, int(os.getenv("EMAIL_VERIFICATION_TTL_HOURS", "24")))
    except ValueError:
        return 24


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def new_verification_token() -> str:
    return secrets.token_urlsafe(TOKEN_BYTES)


def verification_url(token: str) -> str:
    base = os.getenv("APP_PUBLIC_URL", "http://127.0.0.1:8007").rstrip("/")
    query = urllib.parse.urlencode({"token": token})
    return f"{base}/api/auth/verify-email?{query}"


def _from_address() -> str:
    explicit = os.getenv("SMTP_FROM", "").strip()
    if explicit:
        return explicit
    user = os.getenv("SMTP_USER", "").strip()
    if user:
        return f"Data Explorer <{user}>"
    return "Data Explorer <noreply@localhost>"


def _dev_log_allowed() -> bool:
    if os.getenv("EMAIL_VERIFICATION_DEV_LOG", "").strip().lower() in ("1", "true", "yes"):
        return True
    public = os.getenv("APP_PUBLIC_URL", "").strip().lower()
    return "localhost" in public or "127.0.0.1" in public


def send_verification_email(*, to_email: str, token: str) -> None:
    """Deliver a verification link. Logs the URL locally when SMTP is not configured."""
    url = verification_url(token)
    subject = "Verify your Data Explorer account"
    body = (
        "Thanks for signing up for Data Explorer.\n\n"
        "Open this link to verify your email and activate your free credits:\n"
        f"{url}\n\n"
        f"This link expires in {verification_ttl_hours()} hours.\n\n"
        "If you did not create an account, you can ignore this email."
    )

    if not smtp_configured():
        if _dev_log_allowed():
            logger.warning(
                "SMTP not configured — verification link for %s: %s",
                to_email,
                url,
            )
            return
        raise HTTPException(
            status_code=503,
            detail="Email verification is not configured on this server. Contact support.",
        )

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = _from_address()
    message["To"] = to_email
    message.set_content(body)

    host = os.getenv("SMTP_HOST", "").strip()
    try:
        port = int(os.getenv("SMTP_PORT", "587"))
    except ValueError:
        port = 587
    user = os.getenv("SMTP_USER", "").strip()
    password = os.getenv("SMTP_PASSWORD", "").strip()
    use_tls = os.getenv("SMTP_USE_TLS", "true").strip().lower() not in ("0", "false", "no", "off")

    try:
        with smtplib.SMTP(host, port, timeout=15) as smtp:
            if use_tls:
                smtp.starttls()
            if user:
                smtp.login(user, password)
            smtp.send_message(message)
    except OSError as exc:
        logger.exception("Failed to send verification email to %s", to_email)
        raise HTTPException(
            status_code=503,
            detail="Could not send verification email. Try again in a few minutes.",
        ) from exc
