"""Shared EdStack auth + billing HTTP routes for product apps."""

from __future__ import annotations

import hmac
import os
import urllib.parse

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from server import billing, email_verification, google_auth
from server.rate_limit import enforce


class AuthRegisterRequest(BaseModel):
    email: str
    password: str


class AuthLoginRequest(BaseModel):
    email: str
    password: str


class AuthResendVerificationRequest(BaseModel):
    email: str


class CheckoutRequest(BaseModel):
    pack_id: str


class FulfillCheckoutRequest(BaseModel):
    session_id: str


def billing_health_fields() -> dict:
    return {
        "billing_enabled": billing.billing_enabled(),
        "auth_configured": bool(os.getenv("AUTH_SECRET", "").strip()),
        "billing_database_ready": billing.database_ready(),
        "stripe_configured": bool(os.getenv("STRIPE_SECRET_KEY", "").strip()),
        "stripe_webhook_configured": bool(os.getenv("STRIPE_WEBHOOK_SECRET", "").strip()),
        "email_verification_enabled": email_verification.email_verification_enabled(),
        "smtp_configured": email_verification.smtp_configured(),
        "google_oauth_configured": google_auth.google_oauth_configured(),
        "shared_wallet": bool(os.getenv("EDSTACK_BILLING_URL", "").strip()),
        "edstack_billing_url": os.getenv("EDSTACK_BILLING_URL", "").strip() or None,
        "railway_volume_mount_path": os.getenv("RAILWAY_VOLUME_MOUNT_PATH", "").strip() or None,
    }


def ensure_billing_db() -> None:
    billing.ensure_db()


def register_auth_session_middleware(app: FastAPI) -> None:
    @app.middleware("http")
    async def _refresh_auth_session(request: Request, call_next):
        response = await call_next(request)
        if not billing.billing_enabled():
            return response
        path = request.url.path
        if not path.startswith("/api/") or path == "/api/auth/logout":
            return response
        user = billing.user_from_request(request)
        if user is None:
            return response
        billing.refresh_session_cookie(response, user)
        return response


def register_edstack_auth_routes(app: FastAPI, *, default_public_url: str) -> None:
    def _public_base() -> str:
        return os.getenv("APP_PUBLIC_URL", default_public_url).rstrip("/")

    def _account_redirect_url(*, verified: bool = False, error: str | None = None) -> str:
        params: dict[str, str] = {}
        if verified:
            params["verified"] = "1"
        if error:
            params["error"] = error
        if params:
            return f"{_public_base()}/account?{urllib.parse.urlencode(params)}"
        return f"{_public_base()}/account"

    def _login_redirect_url(*, error: str | None = None) -> str:
        if error:
            return f"{_public_base()}/login?{urllib.parse.urlencode({'error': error})}"
        return f"{_public_base()}/account"

    @app.get("/api/billing/config")
    def billing_config() -> dict:
        return {
            "billing_enabled": billing.billing_enabled(),
            "google_oauth_enabled": google_auth.google_oauth_configured(),
            "packs": billing.packs_for_client(),
            "free_signup_credits": billing._free_signup_credits()
            if hasattr(billing, "_free_signup_credits")
            else billing.free_signup_credits(),
            "email_verification_enabled": email_verification.email_verification_enabled(),
            "shared_wallet": bool(os.getenv("EDSTACK_BILLING_URL", "").strip()),
        }

    @app.get("/api/me")
    def me(request: Request) -> dict:
        if not billing.billing_enabled():
            return {"authenticated": False, "billing_enabled": False, "email": None, "credits": None}
        user = billing.user_from_request(request)
        if user is None:
            return {"authenticated": False, "billing_enabled": True, "email": None, "credits": 0}
        return {
            "authenticated": True,
            "billing_enabled": True,
            "email": user.email,
            "credits": user.credits,
            "email_verified": user.email_verified,
        }

    @app.post("/api/auth/register")
    def auth_register(body: AuthRegisterRequest, request: Request, response: Response) -> dict:
        if not billing.billing_enabled():
            raise HTTPException(status_code=503, detail="Billing is not enabled on this server.")
        enforce(request, "auth")
        result = billing.register_user(body.email, body.password)
        billing.refresh_session_cookie(response, result.user)
        if result.needs_email_verification:
            return {
                "needs_email_verification": True,
                "email": result.user.email,
            }
        return {"email": result.user.email, "credits": result.user.credits}

    @app.post("/api/auth/login")
    def auth_login(body: AuthLoginRequest, request: Request, response: Response) -> dict:
        if not billing.billing_enabled():
            raise HTTPException(status_code=503, detail="Billing is not enabled on this server.")
        enforce(request, "auth")
        user = billing.authenticate_user(body.email, body.password)
        billing.refresh_session_cookie(response, user)
        return {"email": user.email, "credits": user.credits}

    @app.get("/api/auth/verify-email")
    def auth_verify_email(request: Request, token: str = ""):
        enforce(request, "auth")
        try:
            user = billing.verify_email_token(token)
        except HTTPException as exc:
            detail = str(exc.detail) if isinstance(exc.detail, str) else "Verification failed."
            return RedirectResponse(_login_redirect_url(error=detail), status_code=302)
        redirect = RedirectResponse(_account_redirect_url(verified=True), status_code=302)
        billing.issue_session_for_user(user, redirect)
        return redirect

    @app.post("/api/auth/resend-verification")
    def auth_resend_verification(body: AuthResendVerificationRequest, request: Request) -> dict:
        if not billing.billing_enabled():
            raise HTTPException(status_code=503, detail="Billing is not enabled on this server.")
        enforce(request, "auth")
        billing.resend_verification_email(body.email)
        return {
            "ok": True,
            "message": (
                "If that email is registered and still needs verification, we sent a new link."
            ),
        }

    @app.post("/api/auth/logout")
    def auth_logout(response: Response) -> dict:
        billing.clear_session_cookie(response)
        return {"ok": True}

    @app.get("/api/auth/google/start")
    def auth_google_start():
        if not billing.billing_enabled():
            raise HTTPException(status_code=503, detail="Accounts are not enabled yet.")
        if not google_auth.google_oauth_configured():
            raise HTTPException(status_code=503, detail="Google sign-in is not configured.")
        state = google_auth.make_oauth_state()
        secure = billing.cookie_secure()
        redirect = RedirectResponse(google_auth.authorization_url(state), status_code=302)
        redirect.set_cookie(
            google_auth.STATE_COOKIE,
            state,
            httponly=True,
            secure=secure,
            samesite="lax",
            max_age=google_auth.STATE_TTL_SECONDS,
            path="/",
        )
        return redirect

    @app.get("/api/auth/google/callback")
    def auth_google_callback(
        request: Request,
        code: str = "",
        state: str = "",
        error: str = "",
    ):
        def finish(*, target: str, session_user: billing.UserRow | None = None) -> RedirectResponse:
            redirect = RedirectResponse(target, status_code=302)
            redirect.delete_cookie(google_auth.STATE_COOKIE, path="/")
            if session_user is not None:
                billing.issue_session_for_user(session_user, redirect)
            return redirect

        if error:
            return finish(target=_login_redirect_url(error="Google sign-in was cancelled."))
        if not billing.billing_enabled():
            return finish(target=_login_redirect_url(error="Accounts are not enabled yet."))
        cookie_state = request.cookies.get(google_auth.STATE_COOKIE, "")
        if not code or not state or not cookie_state:
            return finish(target=_login_redirect_url(error="Google sign-in could not be completed."))
        if not hmac.compare_digest(state, cookie_state) or not google_auth.verify_oauth_state(state):
            return finish(target=_login_redirect_url(error="Google sign-in expired. Try again."))
        try:
            profile = google_auth.exchange_code_for_user(code)
            user = billing.find_or_create_google_user(
                google_sub=str(profile["google_sub"]),
                email=str(profile["email"]),
                email_verified=bool(profile["email_verified"]),
            )
        except HTTPException as exc:
            detail = exc.detail if isinstance(exc.detail, str) else "Google sign-in failed."
            return finish(target=_login_redirect_url(error=detail))
        return finish(target=_login_redirect_url(), session_user=user)

    @app.post("/api/billing/checkout")
    def billing_checkout(body: CheckoutRequest, request: Request) -> dict:
        if not billing.billing_enabled():
            raise HTTPException(status_code=503, detail="Billing is not enabled.")
        user = billing.require_user(request)
        return billing.create_checkout_session(user, body.pack_id)

    @app.post("/api/billing/webhook")
    async def billing_webhook(request: Request) -> dict:
        payload = await request.body()
        signature = request.headers.get("stripe-signature", "")
        billing.handle_stripe_webhook(payload, signature)
        return {"received": True}

    @app.post("/api/billing/fulfill-checkout")
    def billing_fulfill_checkout(body: FulfillCheckoutRequest, request: Request) -> dict:
        if not billing.billing_enabled():
            raise HTTPException(status_code=503, detail="Billing is not enabled.")
        user = billing.require_user(request)
        return billing.fulfill_checkout_session(user, body.session_id)
