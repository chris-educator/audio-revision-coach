"""FastAPI backend for Audio Revision Coach."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
FRONTEND_DIST = ROOT / "client" / "dist"

load_dotenv(ROOT / ".env")

from server import billing  # noqa: E402
from server.billing_gate import attach_credits_fields, charge_or_skip, refund, require_signed_in  # noqa: E402
from server.edstack_auth_routes import (  # noqa: E402
    billing_health_fields,
    ensure_billing_db,
    register_auth_session_middleware,
    register_edstack_auth_routes,
)
from server.rate_limit import enforce_rate_limit  # noqa: E402
from server.sentry_setup import init_sentry  # noqa: E402
from src.app_assistant import chat_with_assistant  # noqa: E402
from src.config import is_google_api_key_configured  # noqa: E402
from src.credits import credits_for_deck, credits_for_script  # noqa: E402
from src.llm_config import (  # noqa: E402
    get_llm_model,
    get_llm_provider,
    is_anthropic_configured,
    is_llm_configured,
)
from src.revision.catalog import list_topics  # noqa: E402
from src.revision_generator import generate_revision_deck, generate_revision_script  # noqa: E402

init_sentry(service_name="audio-revision-coach")

DECK_USER_ERROR = "Flashcard deck generation failed. Try again in a moment."
SCRIPT_USER_ERROR = "Revision script generation failed. Try again in a moment."
ASSISTANT_USER_ERROR = "The Assistant could not respond. Try again in a moment."

app = FastAPI(title="Audio Revision Coach API")


@app.on_event("startup")
def _edstack_billing_startup() -> None:
    ensure_billing_db()


register_auth_session_middleware(app)
register_edstack_auth_routes(app, default_public_url="http://127.0.0.1:5203")

SERVE_FRONTEND = (FRONTEND_DIST / "index.html").is_file()
_NO_CACHE_FILES = frozenset({"sw.js"})


def _pwa_file_response(path: Path) -> FileResponse:
    headers: dict[str, str] = {}
    if path.name in _NO_CACHE_FILES:
        headers["Cache-Control"] = "no-cache"
    return FileResponse(path, headers=headers)


if not SERVE_FRONTEND:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5203", "http://127.0.0.1:5203"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


class RevisionRequest(BaseModel):
    topic_id: str = Field(default="", max_length=64)
    custom_topic: str = Field(default="", max_length=200)
    year_level: str = Field(default="Year 10", max_length=40)
    subject: str = Field(default="", max_length=80)


class AssistantChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class AssistantChatRequest(BaseModel):
    messages: list[AssistantChatMessage]


class AssistantChatResponse(BaseModel):
    reply: str


@app.get("/api/health")
def health() -> dict:
    return {
        **billing_health_fields(),
        "status": "ok",
        "service": "audio-revision-coach",
        "product": "Audio Revision Coach",
        "api_key_configured": is_llm_configured(),
        "llm_provider": get_llm_provider(),
        "llm_model": get_llm_model(),
        "anthropic_configured": is_anthropic_configured(),
        "gemini_configured": is_google_api_key_configured(),
        "model": get_llm_model(),
        "frontend_built": SERVE_FRONTEND,
        "topic_count": len(list_topics()),
    }


@app.get("/api/revision/topics")
def revision_topics() -> dict:
    return {"topics": list_topics()}


@app.post("/api/revision/deck")
def revision_deck(body: RevisionRequest, request: Request) -> dict:
    enforce_rate_limit(request, bucket="generate")
    if not is_llm_configured():
        raise HTTPException(status_code=503, detail="Primary LLM is not configured on the server.")

    credit_cost = credits_for_deck()
    billing_user, credits_remaining, credits_debited = charge_or_skip(
        request, credit_cost, reason="revision_deck"
    )

    result = generate_revision_deck(
        topic_id=body.topic_id.strip(),
        custom_topic=body.custom_topic.strip(),
        year_level=body.year_level.strip(),
        subject=body.subject.strip(),
    )
    if result.error or not result.payload:
        if credits_debited and billing_user:
            refund(billing_user.id, credit_cost, reason="revision_deck_refund", remaining=credits_remaining)
        raise HTTPException(status_code=422, detail=result.error or DECK_USER_ERROR)

    response_body = {**result.payload, "credit_cost": credit_cost}
    if billing.billing_enabled() and billing_user is not None and credits_remaining is not None:
        attach_credits_fields(response_body, user=billing_user, charged=credit_cost, remaining=credits_remaining)
    return response_body


@app.post("/api/revision/script")
def revision_script(body: RevisionRequest, request: Request) -> dict:
    enforce_rate_limit(request, bucket="generate")
    if not is_llm_configured():
        raise HTTPException(status_code=503, detail="Primary LLM is not configured on the server.")

    credit_cost = credits_for_script()
    billing_user, credits_remaining, credits_debited = charge_or_skip(
        request, credit_cost, reason="revision_script"
    )

    result = generate_revision_script(
        topic_id=body.topic_id.strip(),
        custom_topic=body.custom_topic.strip(),
        year_level=body.year_level.strip(),
        subject=body.subject.strip(),
    )
    if result.error or not result.payload:
        if credits_debited and billing_user:
            refund(billing_user.id, credit_cost, reason="revision_script_refund", remaining=credits_remaining)
        raise HTTPException(status_code=422, detail=result.error or SCRIPT_USER_ERROR)

    response_body = {**result.payload, "credit_cost": credit_cost}
    if billing.billing_enabled() and billing_user is not None and credits_remaining is not None:
        attach_credits_fields(response_body, user=billing_user, charged=credit_cost, remaining=credits_remaining)
    return response_body


@app.post("/api/assistant/chat", response_model=AssistantChatResponse)
def assistant_chat(body: AssistantChatRequest, request: Request) -> AssistantChatResponse:
    enforce_rate_limit(request, bucket="assistant")
    require_signed_in(request)
    if not is_google_api_key_configured():
        raise HTTPException(status_code=503, detail="GOOGLE_API_KEY is not configured on the server.")
    if not body.messages:
        raise HTTPException(status_code=400, detail="At least one message is required.")
    last = body.messages[-1]
    if last.role != "user" or not last.content.strip():
        raise HTTPException(status_code=400, detail="The latest message must be a non-empty user message.")
    payload = [{"role": m.role, "content": m.content} for m in body.messages]
    try:
        reply = chat_with_assistant(payload)
        return AssistantChatResponse(reply=reply)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception:
        raise HTTPException(status_code=502, detail=ASSISTANT_USER_ERROR) from None


if SERVE_FRONTEND:
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        candidate = (FRONTEND_DIST / full_path).resolve()
        dist_root = FRONTEND_DIST.resolve()
        if full_path and candidate.is_file() and dist_root in candidate.parents:
            return _pwa_file_response(candidate)
        index = FRONTEND_DIST / "index.html"
        if index.is_file():
            return FileResponse(index)
        raise HTTPException(status_code=404, detail="Frontend build not found")

else:

    @app.get("/")
    def frontend_missing() -> dict[str, str]:
        return {
            "status": "ok",
            "detail": "Run npm run dev in client/ or build and uvicorn on port 8029.",
            "api_health": "/api/health",
        }
