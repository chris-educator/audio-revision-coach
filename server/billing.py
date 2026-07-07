"""Accounts, credits, and Stripe-ready billing (feature-flagged)."""

from __future__ import annotations

import json
import os
import sqlite3
import time
import uuid
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator
from urllib.parse import urlparse

import bcrypt
import jwt
from fastapi import HTTPException, Request, Response

from server import email_verification

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DB_PATH = ROOT / "data" / "billing.db"
SESSION_COOKIE = "de_session"
DEFAULT_SESSION_DAYS = 365


def session_max_age_seconds() -> int:
    """How long sign-in cookies and JWTs remain valid (sliding refresh on /api/me)."""
    try:
        days = int(os.getenv("AUTH_SESSION_DAYS", str(DEFAULT_SESSION_DAYS)))
    except ValueError:
        days = DEFAULT_SESSION_DAYS
    return max(1, days) * 86400

# Pack definitions for Checkout (Stripe Price IDs wired via env later).
CREDIT_PACKS: list[dict[str, Any]] = [
    {
        "id": "pack_50",
        "label": "50 credits",
        "credits": 50,
        "price_display": "$9",
        "stripe_price_id_env": "STRIPE_PRICE_PACK_50",
    },
    {
        "id": "pack_150",
        "label": "150 credits",
        "credits": 150,
        "price_display": "$24",
        "stripe_price_id_env": "STRIPE_PRICE_PACK_150",
    },
    {
        "id": "pack_300",
        "label": "300 credits",
        "credits": 300,
        "price_display": "$45",
        "stripe_price_id_env": "STRIPE_PRICE_PACK_300",
    },
]


def billing_enabled() -> bool:
    return os.getenv("BILLING_ENABLED", "").strip().lower() in ("1", "true", "yes")


def _auth_secret() -> str | None:
    secret = os.getenv("AUTH_SECRET", "").strip()
    return secret or None


def cookie_secure() -> bool:
    """Whether auth cookies should set the Secure flag.

    Honours an explicit AUTH_COOKIE_SECURE override, otherwise infers from
    APP_PUBLIC_URL so production (https) is secure by default even if the env
    var is forgotten.
    """
    explicit = os.getenv("AUTH_COOKIE_SECURE", "").strip().lower()
    if explicit in ("1", "true", "yes"):
        return True
    if explicit in ("0", "false", "no"):
        return False
    public_url = os.getenv("APP_PUBLIC_URL", "").strip()
    if public_url:
        return urlparse(public_url).scheme == "https"
    return False


def _db_path() -> Path:
    raw = os.getenv("BILLING_DATABASE_PATH", "").strip()
    path = Path(raw) if raw else DEFAULT_DB_PATH
    # Relative paths must not depend on process cwd (Railway uvicorn may not be /app).
    if not path.is_absolute():
        path = (ROOT / path).resolve()
    return path


DEFAULT_FREE_SIGNUP_CREDITS = 20


def _free_signup_credits() -> int:
    """One-time ledger credit granted on sign-up (default 10)."""
    try:
        return max(0, int(os.getenv("FREE_SIGNUP_CREDITS", str(DEFAULT_FREE_SIGNUP_CREDITS))))
    except ValueError:
        return DEFAULT_FREE_SIGNUP_CREDITS


def free_signup_credits() -> int:
    """Public alias for signup bonus (used by /api/billing/config)."""
    return _free_signup_credits()


@dataclass(frozen=True)
class UserRow:
    id: str
    email: str
    credits: int
    email_verified: bool = True


@dataclass(frozen=True)
class RegisterResult:
    user: UserRow
    needs_email_verification: bool = False


@contextmanager
def _connect() -> Iterator[sqlite3.Connection]:
    """Open a billing DB connection and always close it.

    WAL + a busy timeout keep concurrent writes (webhook, fulfill, debit) from
    failing with "database is locked" under load.
    """
    path = _db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, check_same_thread=False, timeout=5.0)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA busy_timeout=5000")
        yield conn
    finally:
        conn.close()


def _migrate_users_schema(conn: sqlite3.Connection) -> None:
    columns = {row[1] for row in conn.execute("PRAGMA table_info(users)")}
    if "google_sub" not in columns:
        conn.execute("ALTER TABLE users ADD COLUMN google_sub TEXT")
        conn.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub) "
            "WHERE google_sub IS NOT NULL"
        )
    columns = {row[1] for row in conn.execute("PRAGMA table_info(users)")}
    if "email_verified_at" not in columns:
        conn.execute("ALTER TABLE users ADD COLUMN email_verified_at TEXT")
        conn.execute(
            "UPDATE users SET email_verified_at = created_at WHERE email_verified_at IS NULL"
        )
    if "email_verify_token_hash" not in columns:
        conn.execute("ALTER TABLE users ADD COLUMN email_verify_token_hash TEXT")
    if "email_verify_expires_at" not in columns:
        conn.execute("ALTER TABLE users ADD COLUMN email_verify_expires_at TEXT")


def init_db() -> None:
    with _connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL DEFAULT '',
                google_sub TEXT,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS credit_ledger (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                delta INTEGER NOT NULL,
                reason TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
            CREATE TABLE IF NOT EXISTS usage_events (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                operation TEXT NOT NULL,
                prompt_tokens INTEGER NOT NULL DEFAULT 0,
                candidates_tokens INTEGER NOT NULL DEFAULT 0,
                total_tokens INTEGER NOT NULL DEFAULT 0,
                credits_charged INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS stripe_events (
                event_id TEXT PRIMARY KEY,
                processed_at TEXT NOT NULL
            );
            """
        )
        _migrate_users_schema(conn)
        conn.commit()


def database_path_display() -> str:
    """Path string safe for /api/health (no secrets)."""
    return str(_db_path())


def database_ready() -> bool:
    """True when the billing DB directory is writable and SQLite can open."""
    path = _db_path()
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        if not os.access(path.parent, os.W_OK | os.X_OK):
            return False
        conn = sqlite3.connect(path)
        conn.execute("SELECT 1")
        conn.close()
        return True
    except OSError:
        return False
    except sqlite3.Error:
        return False


def ensure_db() -> None:
    """Create schema when the data directory is available (safe to call every startup)."""
    if database_ready():
        init_db()


def _stripe_event_seen(conn: sqlite3.Connection, event_id: str) -> bool:
    row = conn.execute(
        "SELECT 1 FROM stripe_events WHERE event_id = ?",
        (event_id,),
    ).fetchone()
    return row is not None


def _mark_stripe_event(conn: sqlite3.Connection, event_id: str) -> None:
    try:
        conn.execute(
            "INSERT INTO stripe_events (event_id, processed_at) VALUES (?, ?)",
            (event_id, _now_iso()),
        )
    except sqlite3.IntegrityError:
        # Concurrent webhook delivery can race on the same event_id.
        pass


def _checkout_session_key(session_id: str) -> str:
    return f"checkout_session:{session_id}"


def _stripe_value(obj: Any, key: str, default: Any = None) -> Any:
    """Read a field from a Stripe object or plain dict."""
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(key, default)
    value = getattr(obj, key, None)
    if value is not None:
        return value
    getter = getattr(obj, "get", None)
    if callable(getter):
        return getter(key, default)
    return default


def _checkout_payment_complete(session: Any) -> bool:
    payment_status = str(_stripe_value(session, "payment_status") or "")
    status = str(_stripe_value(session, "status") or "")
    return payment_status == "paid" or status == "complete"


def _credits_from_checkout_session(session: Any) -> int:
    metadata = _stripe_value(session, "metadata") or {}
    credits_raw = _stripe_value(metadata, "credits")
    if credits_raw is not None:
        return int(credits_raw)

    pack_id = _stripe_value(metadata, "pack_id")
    if pack_id:
        pack = next((p for p in CREDIT_PACKS if p["id"] == pack_id), None)
        if pack:
            return int(pack["credits"])

    raise HTTPException(
        status_code=400,
        detail="Checkout session is missing credit metadata.",
    )


def _grant_checkout_credits(
    conn: sqlite3.Connection,
    *,
    session_id: str,
    user_id: str,
    credits: int,
) -> bool:
    """Idempotent credit grant for a paid Checkout session. Returns True if newly granted."""
    if credits <= 0:
        return False
    key = _checkout_session_key(session_id)
    if _stripe_event_seen(conn, key):
        return False
    try:
        conn.execute(
            "INSERT INTO stripe_events (event_id, processed_at) VALUES (?, ?)",
            (key, _now_iso()),
        )
    except sqlite3.IntegrityError:
        return False
    conn.execute(
        "INSERT INTO credit_ledger (id, user_id, delta, reason, created_at) VALUES (?, ?, ?, ?, ?)",
        (
            str(uuid.uuid4()),
            str(user_id),
            credits,
            "stripe_purchase",
            _now_iso(),
        ),
    )
    return True


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _balance(conn: sqlite3.Connection, user_id: str) -> int:
    row = conn.execute(
        "SELECT COALESCE(SUM(delta), 0) AS balance FROM credit_ledger WHERE user_id = ?",
        (user_id,),
    ).fetchone()
    return int(row["balance"] if row else 0)


def _row_email_verified(row: sqlite3.Row) -> bool:
    return bool(row["email_verified_at"])


def _verification_expiry_iso() -> str:
    hours = email_verification.verification_ttl_hours()
    expires = datetime.now(timezone.utc).timestamp() + hours * 3600
    return datetime.fromtimestamp(expires, timezone.utc).isoformat()


def _store_verification_token(conn: sqlite3.Connection, user_id: str) -> str:
    token = email_verification.new_verification_token()
    conn.execute(
        """
        UPDATE users
        SET email_verify_token_hash = ?, email_verify_expires_at = ?
        WHERE id = ?
        """,
        (email_verification.hash_token(token), _verification_expiry_iso(), user_id),
    )
    return token


def _grant_signup_bonus_if_needed(conn: sqlite3.Connection, user_id: str) -> None:
    existing = conn.execute(
        "SELECT 1 FROM credit_ledger WHERE user_id = ? AND reason = 'signup_bonus'",
        (user_id,),
    ).fetchone()
    if existing:
        return
    signup_credits = _free_signup_credits()
    if signup_credits > 0:
        conn.execute(
            "INSERT INTO credit_ledger (id, user_id, delta, reason, created_at) VALUES (?, ?, ?, ?, ?)",
            (
                str(uuid.uuid4()),
                user_id,
                signup_credits,
                "signup_bonus",
                _now_iso(),
            ),
        )


def _user_row_from_db(conn: sqlite3.Connection, row: sqlite3.Row) -> UserRow:
    return UserRow(
        id=row["id"],
        email=row["email"],
        credits=_balance(conn, row["id"]),
        email_verified=_row_email_verified(row),
    )


def _invalid_password_check() -> None:
    """Spend time comparable to bcrypt.verify to reduce login email-enumeration timing."""
    dummy = bcrypt.hashpw(b"invalid-password-check", bcrypt.gensalt())
    bcrypt.checkpw(b"wrong-password", dummy)


def register_user(email: str, password: str) -> RegisterResult:
    normalized = email.strip().lower()
    if not normalized or "@" not in normalized:
        raise HTTPException(status_code=400, detail="A valid email is required.")
    if len(normalized) > 254:
        raise HTTPException(status_code=400, detail="Email is too long.")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
    if len(password) > 128:
        raise HTTPException(status_code=400, detail="Password must be at most 128 characters.")

    user_id = str(uuid.uuid4())
    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    verification_required = email_verification.email_verification_enabled()
    try:
        with _connect() as conn:
            conn.execute(
                """
                INSERT INTO users (
                    id, email, password_hash, created_at, email_verified_at
                ) VALUES (?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    normalized,
                    password_hash,
                    _now_iso(),
                    None if verification_required else _now_iso(),
                ),
            )
            if verification_required:
                token = _store_verification_token(conn, user_id)
                conn.commit()
                email_verification.send_verification_email(to_email=normalized, token=token)
                row = conn.execute(
                    "SELECT id, email, email_verified_at FROM users WHERE id = ?",
                    (user_id,),
                ).fetchone()
                return RegisterResult(
                    user=_user_row_from_db(conn, row),
                    needs_email_verification=True,
                )

            _grant_signup_bonus_if_needed(conn, user_id)
            conn.commit()
            row = conn.execute(
                "SELECT id, email, email_verified_at FROM users WHERE id = ?",
                (user_id,),
            ).fetchone()
            return RegisterResult(user=_user_row_from_db(conn, row))
    except sqlite3.IntegrityError as exc:
        raise HTTPException(status_code=409, detail="An account with this email already exists.") from exc


def authenticate_user(email: str, password: str) -> UserRow:
    normalized = email.strip().lower()
    with _connect() as conn:
        row = conn.execute(
            """
            SELECT id, email, password_hash, email_verified_at
            FROM users WHERE email = ?
            """,
            (normalized,),
        ).fetchone()
        if not row:
            _invalid_password_check()
            raise HTTPException(status_code=401, detail="Invalid email or password.")
        stored_hash = str(row["password_hash"] or "")
        if not stored_hash:
            raise HTTPException(
                status_code=401,
                detail="This account uses Google sign-in. Choose Continue with Google.",
            )
        if not bcrypt.checkpw(
            password.encode("utf-8"),
            stored_hash.encode("utf-8"),
        ):
            raise HTTPException(status_code=401, detail="Invalid email or password.")
        return _user_row_from_db(conn, row)


def verify_email_token(token: str) -> UserRow:
    if not token.strip():
        raise HTTPException(status_code=400, detail="Verification link is invalid.")
    token_hash = email_verification.hash_token(token.strip())
    with _connect() as conn:
        row = conn.execute(
            """
            SELECT id, email, email_verified_at, email_verify_token_hash, email_verify_expires_at
            FROM users
            WHERE email_verify_token_hash = ?
            """,
            (token_hash,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=400, detail="Verification link is invalid or expired.")
        if _row_email_verified(row):
            conn.execute(
                """
                UPDATE users
                SET email_verify_token_hash = NULL, email_verify_expires_at = NULL
                WHERE id = ?
                """,
                (row["id"],),
            )
            conn.commit()
            fresh = conn.execute(
                "SELECT id, email, email_verified_at FROM users WHERE id = ?",
                (row["id"],),
            ).fetchone()
            return _user_row_from_db(conn, fresh)

        expires_raw = str(row["email_verify_expires_at"] or "")
        if expires_raw:
            try:
                expires_at = datetime.fromisoformat(expires_raw)
                if expires_at.tzinfo is None:
                    expires_at = expires_at.replace(tzinfo=timezone.utc)
                if datetime.now(timezone.utc) > expires_at:
                    raise HTTPException(
                        status_code=400,
                        detail="Verification link has expired. Request a new one from the sign-in page.",
                    )
            except ValueError:
                pass

        conn.execute(
            """
            UPDATE users
            SET email_verified_at = ?, email_verify_token_hash = NULL, email_verify_expires_at = NULL
            WHERE id = ?
            """,
            (_now_iso(), row["id"]),
        )
        _grant_signup_bonus_if_needed(conn, row["id"])
        conn.commit()
        fresh = conn.execute(
            "SELECT id, email, email_verified_at FROM users WHERE id = ?",
            (row["id"],),
        ).fetchone()
        return _user_row_from_db(conn, fresh)


def resend_verification_email(email: str) -> None:
    normalized = email.strip().lower()
    if not normalized or "@" not in normalized:
        return
    if not email_verification.email_verification_enabled():
        return

    with _connect() as conn:
        row = conn.execute(
            """
            SELECT id, email, password_hash, email_verified_at
            FROM users WHERE email = ?
            """,
            (normalized,),
        ).fetchone()
        if not row or _row_email_verified(row) or not str(row["password_hash"] or ""):
            return
        token = _store_verification_token(conn, row["id"])
        conn.commit()
        email_verification.send_verification_email(to_email=normalized, token=token)


def find_or_create_google_user(
    *,
    google_sub: str,
    email: str,
    email_verified: bool,
) -> UserRow:
    if not email_verified:
        raise HTTPException(
            status_code=400,
            detail="Your Google account email must be verified before signing in.",
        )
    normalized = email.strip().lower()
    if not normalized or "@" not in normalized:
        raise HTTPException(status_code=400, detail="A valid email is required.")

    with _connect() as conn:
        by_sub = conn.execute(
            "SELECT id, email, email_verified_at FROM users WHERE google_sub = ?",
            (google_sub,),
        ).fetchone()
        if by_sub:
            return _user_row_from_db(conn, by_sub)

        by_email = conn.execute(
            "SELECT id, email, google_sub, email_verified_at FROM users WHERE email = ?",
            (normalized,),
        ).fetchone()
        if by_email:
            existing_sub = str(by_email["google_sub"] or "")
            if existing_sub and existing_sub != google_sub:
                raise HTTPException(
                    status_code=409,
                    detail="This email is linked to a different Google account.",
                )
            conn.execute(
                """
                UPDATE users
                SET google_sub = ?,
                    email_verified_at = COALESCE(email_verified_at, ?),
                    email_verify_token_hash = NULL,
                    email_verify_expires_at = NULL
                WHERE id = ?
                """,
                (google_sub, _now_iso(), by_email["id"]),
            )
            conn.commit()
            fresh = conn.execute(
                "SELECT id, email, email_verified_at FROM users WHERE id = ?",
                (by_email["id"],),
            ).fetchone()
            return _user_row_from_db(conn, fresh)

        user_id = str(uuid.uuid4())
        now = _now_iso()
        conn.execute(
            """
            INSERT INTO users (
                id, email, password_hash, google_sub, created_at, email_verified_at
            ) VALUES (?, ?, '', ?, ?, ?)
            """,
            (user_id, normalized, google_sub, now, now),
        )
        _grant_signup_bonus_if_needed(conn, user_id)
        conn.commit()
        fresh = conn.execute(
            "SELECT id, email, email_verified_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        return _user_row_from_db(conn, fresh)


def issue_session_for_user(user: UserRow, response: Response) -> None:
    refresh_session_cookie(response, user)


def refresh_session_cookie(response: Response, user: UserRow) -> None:
    """Issue or extend the session cookie (called on sign-in and periodic activity)."""
    token = _issue_token(user)
    set_session_cookie(response, token)


def _issue_token(user: UserRow) -> str:
    secret = _auth_secret()
    if not secret:
        raise HTTPException(status_code=503, detail="AUTH_SECRET is not configured.")
    exp = int(time.time()) + session_max_age_seconds()
    return jwt.encode(
        {"sub": user.id, "email": user.email, "exp": exp},
        secret,
        algorithm="HS256",
    )


def set_session_cookie(response: Response, token: str) -> None:
    secure = cookie_secure()
    response.set_cookie(
        SESSION_COOKIE,
        token,
        httponly=True,
        secure=secure,
        samesite="lax",
        max_age=session_max_age_seconds(),
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        SESSION_COOKIE,
        path="/",
        secure=cookie_secure(),
        samesite="lax",
        httponly=True,
    )


def user_from_request(request: Request) -> UserRow | None:
    secret = _auth_secret()
    if not secret:
        return None
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        return None
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None
    user_id = str(payload.get("sub") or "")
    if not user_id:
        return None
    with _connect() as conn:
        row = conn.execute(
            "SELECT id, email, email_verified_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        if not row:
            return None
        return _user_row_from_db(conn, row)


def require_user(request: Request) -> UserRow:
    """Signed-in and email-verified (required before credits, generate, checkout)."""
    user = user_from_request(request)
    if not user:
        raise HTTPException(status_code=401, detail="Sign in required.")
    if email_verification.email_verification_enabled() and not user.email_verified:
        raise HTTPException(
            status_code=403,
            detail="Please verify your email to continue. Check your inbox for a verification link.",
        )
    return user


def require_authenticated(request: Request) -> UserRow:
    """Signed-in only (account UI, resend verification, logout-adjacent flows)."""
    user = user_from_request(request)
    if not user:
        raise HTTPException(status_code=401, detail="Sign in required.")
    return user


def require_billing_user(request: Request) -> UserRow:
    """Alias for paid AI actions (research, generate)."""
    return require_user(request)


def debit_credits(user_id: str, amount: int, *, reason: str) -> int:
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid credit amount.")
    with _connect() as conn:
        # Atomic check-and-debit: the row is only inserted when the current
        # balance still covers the amount, so concurrent debits can't overdraw.
        cursor = conn.execute(
            """
            INSERT INTO credit_ledger (id, user_id, delta, reason, created_at)
            SELECT ?, ?, ?, ?, ?
            WHERE (
                SELECT COALESCE(SUM(delta), 0) FROM credit_ledger WHERE user_id = ?
            ) >= ?
            """,
            (str(uuid.uuid4()), user_id, -amount, reason, _now_iso(), user_id, amount),
        )
        conn.commit()
        if cursor.rowcount != 1:
            balance = _balance(conn, user_id)
            raise HTTPException(
                status_code=402,
                detail=f"Not enough credits. This run needs {amount}; you have {balance}.",
            )
        return _balance(conn, user_id)


def add_credits(user_id: str, amount: int, *, reason: str) -> int:
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid credit amount.")
    with _connect() as conn:
        conn.execute(
            "INSERT INTO credit_ledger (id, user_id, delta, reason, created_at) VALUES (?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), user_id, amount, reason, _now_iso()),
        )
        conn.commit()
        return _balance(conn, user_id)


def log_usage(
    *,
    user_id: str | None,
    usages: list[dict[str, Any]],
    credits_charged: int,
) -> None:
    with _connect() as conn:
        for entry in usages:
            conn.execute(
                """
                INSERT INTO usage_events (
                    id, user_id, operation, prompt_tokens, candidates_tokens,
                    total_tokens, credits_charged, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    str(uuid.uuid4()),
                    user_id,
                    str(entry.get("operation") or "unknown"),
                    int(entry.get("prompt_tokens") or 0),
                    int(entry.get("candidates_tokens") or 0),
                    int(entry.get("total_tokens") or 0),
                    credits_charged,
                    _now_iso(),
                ),
            )
        conn.commit()


def packs_for_client() -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for pack in CREDIT_PACKS:
        price_id = os.getenv(pack["stripe_price_id_env"], "").strip()
        out.append(
            {
                "id": pack["id"],
                "label": pack["label"],
                "credits": pack["credits"],
                "price_display": pack["price_display"],
                "available": bool(price_id),
            }
        )
    return out


def create_checkout_session(user: UserRow, pack_id: str) -> dict[str, str]:
    stripe_key = os.getenv("STRIPE_SECRET_KEY", "").strip()
    if not stripe_key:
        raise HTTPException(
            status_code=503,
            detail="Stripe is not configured yet. Set STRIPE_SECRET_KEY and price IDs.",
        )

    pack = next((p for p in CREDIT_PACKS if p["id"] == pack_id), None)
    if not pack:
        raise HTTPException(status_code=400, detail="Unknown credit pack.")

    price_id = os.getenv(pack["stripe_price_id_env"], "").strip()
    if not price_id:
        raise HTTPException(status_code=503, detail="This pack is not available yet.")

    try:
        import stripe  # type: ignore[import-untyped]
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail="Install stripe package to enable checkout.",
        ) from exc

    stripe.api_key = stripe_key
    base_url = os.getenv("APP_PUBLIC_URL", "http://127.0.0.1:8007").rstrip("/")
    session = stripe.checkout.Session.create(
        mode="payment",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=f"{base_url}/account?checkout=success&session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{base_url}/account?checkout=cancelled",
        client_reference_id=user.id,
        metadata={
            "user_id": user.id,
            "pack_id": pack_id,
            "credits": str(pack["credits"]),
        },
    )
    if not session.url:
        raise HTTPException(status_code=500, detail="Could not start checkout.")
    return {"checkout_url": session.url}


def handle_stripe_webhook(payload: bytes, signature: str) -> None:
    secret = os.getenv("STRIPE_WEBHOOK_SECRET", "").strip()
    if not secret:
        raise HTTPException(status_code=503, detail="Stripe webhook secret not configured.")

    try:
        import stripe  # type: ignore[import-untyped]
    except ImportError as exc:
        raise HTTPException(status_code=503, detail="Stripe package not installed.") from exc

    stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "").strip()
    try:
        event = stripe.Webhook.construct_event(payload, signature, secret)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid webhook signature.") from exc

    event_id = str(_stripe_value(event, "id") or "")
    if not event_id:
        raise HTTPException(status_code=400, detail="Webhook event missing id.")

    event_type = str(_stripe_value(event, "type") or "")
    data = _stripe_value(event, "data") or {}
    session = _stripe_value(data, "object")

    with _connect() as conn:
        if _stripe_event_seen(conn, event_id):
            return
        if event_type != "checkout.session.completed":
            _mark_stripe_event(conn, event_id)
            conn.commit()
            return

        if not session:
            raise HTTPException(status_code=400, detail="Webhook event missing checkout session.")
        session_id = str(_stripe_value(session, "id") or "")
        metadata = _stripe_value(session, "metadata") or {}
        user_id = _stripe_value(metadata, "user_id") or _stripe_value(
            session, "client_reference_id"
        )
        if user_id and session_id:
            try:
                credits = _credits_from_checkout_session(session)
            except HTTPException:
                credits = 0
            if credits > 0:
                _grant_checkout_credits(
                    conn,
                    session_id=session_id,
                    user_id=str(user_id),
                    credits=credits,
                )
        _mark_stripe_event(conn, event_id)
        conn.commit()


def fulfill_checkout_session(user: UserRow, session_id: str) -> dict[str, Any]:
    """Grant credits from a completed Checkout session (backup when webhook is delayed)."""
    normalized = session_id.strip()
    if not normalized.startswith("cs_"):
        raise HTTPException(status_code=400, detail="Invalid checkout session id.")

    stripe_key = os.getenv("STRIPE_SECRET_KEY", "").strip()
    if not stripe_key:
        raise HTTPException(status_code=503, detail="Stripe is not configured.")

    try:
        import stripe  # type: ignore[import-untyped]
    except ImportError as exc:
        raise HTTPException(status_code=503, detail="Stripe package not installed.") from exc

    stripe.api_key = stripe_key
    try:
        session = stripe.checkout.Session.retrieve(normalized)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Could not load checkout session.") from exc

    if not _checkout_payment_complete(session):
        raise HTTPException(
            status_code=400,
            detail="Payment is not complete yet. Credits are added after Stripe confirms payment.",
        )

    metadata = _stripe_value(session, "metadata") or {}
    owner_id = _stripe_value(metadata, "user_id") or _stripe_value(
        session, "client_reference_id"
    )
    if not owner_id or str(owner_id) != str(user.id):
        raise HTTPException(
            status_code=403,
            detail="This checkout session belongs to another account.",
        )

    credits = _credits_from_checkout_session(session)

    with _connect() as conn:
        granted = _grant_checkout_credits(
            conn,
            session_id=normalized,
            user_id=user.id,
            credits=credits,
        )
        conn.commit()
        balance = _balance(conn, user.id)

    return {"credits": balance, "granted": granted}


def _activate_shared_wallet() -> None:
    from server import edstack_billing_client as remote

    if not remote.enabled():
        return

    globals().update(
        {
            "ensure_db": remote.ensure_db,
            "database_ready": remote.database_ready,
            "database_path_display": remote.database_path_display,
            "register_user": remote.register_user,
            "authenticate_user": remote.authenticate_user,
            "verify_email_token": remote.verify_email_token,
            "resend_verification_email": remote.resend_verification_email,
            "find_or_create_google_user": remote.find_or_create_google_user,
            "user_from_request": remote.user_from_request,
            "debit_credits": remote.debit_credits,
            "add_credits": remote.add_credits,
            "log_usage": remote.log_usage,
            "create_checkout_session": remote.create_checkout_session,
            "fulfill_checkout_session": remote.fulfill_checkout_session,
            "handle_stripe_webhook": remote.handle_stripe_webhook,
            "set_session_cookie": remote.set_session_cookie,
            "clear_session_cookie": remote.clear_session_cookie,
        }
    )


_activate_shared_wallet()
