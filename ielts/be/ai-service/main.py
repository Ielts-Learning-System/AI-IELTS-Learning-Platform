"""
IELTS AI Service – FastAPI
Handles all Generative AI tasks (image parsing, feedback generation, etc.)
using Google Gemini models.
"""

import json
import os
import re
import time
import logging
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
AUTH_SERVICE_INTERNAL_URL = os.getenv(
    "AUTH_SERVICE_INTERNAL_URL", "http://auth-service:3001"
)
INTERNAL_SECRET = os.getenv("INTERNAL_SECRET", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-preview-04-17")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _fetch_ai_config() -> dict:
    """
    Fetch the live Gemini API key + prompt templates from the auth-service
    internal endpoint.  Raises HTTPException on failure.
    """
    url = f"{AUTH_SERVICE_INTERNAL_URL}/api/internal/system-config"
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(
                url, headers={"x-internal-secret": INTERNAL_SECRET}
            )
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as exc:
            logger.error("Auth-service returned %s for config fetch", exc.response.status_code)
            raise HTTPException(
                status_code=502,
                detail="Could not retrieve AI configuration from auth-service.",
            )
        except httpx.RequestError as exc:
            logger.error("Auth-service unreachable: %s", exc)
            raise HTTPException(
                status_code=503,
                detail="Auth-service is unreachable. Cannot load AI configuration.",
            )


def _strip_markdown_fences(text: str) -> str:
    """Remove ```json ... ``` or ``` ... ``` wrappers that Gemini sometimes adds."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("AI Service starting up – model: %s", GEMINI_MODEL)
    yield
    logger.info("AI Service shutting down")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="IELTS AI Service",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: str
    model: str


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse)
async def health():
    return {"status": "AI Service is running", "model": GEMINI_MODEL}


@app.post("/api/ai/parse-listening-image")
async def parse_listening_image(file: UploadFile = File(...)):
    """
    Accept a PNG/JPEG image of an IELTS Listening test page and return a
    structured JSON object that matches the ListeningTest MongoDB schema.

    The endpoint:
    1. Fetches the live Gemini API key + listening prompt from auth-service.
    2. Sends the image + prompt to Gemini.
    3. Parses and returns the JSON (strips markdown fences if present).
    """
    # --- validate mime type ------------------------------------------------
    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file.content_type}'. Use JPEG, PNG, WEBP, or GIF.",
        )

    # --- load AI config from DB -------------------------------------------
    config = await _fetch_ai_config()
    api_key: str = config.get("geminiApiKey", "").strip()
    system_prompt: str = config.get("listeningPromptTemplate", "").strip()

    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Gemini API key is not configured. Please set it in Admin → AI Manager.",
        )
    if not system_prompt:
        raise HTTPException(
            status_code=503,
            detail="Listening prompt template is not configured. Please set it in Admin → AI Manager.",
        )

    # --- read image bytes -------------------------------------------------
    image_bytes = await file.read()
    if len(image_bytes) > 20 * 1024 * 1024:  # 20 MB hard limit
        raise HTTPException(status_code=413, detail="Image file is too large (max 20 MB).")

    # --- call Gemini with retry on transient 503 -------------------------
    client = genai.Client(api_key=api_key, http_options={"api_version": "v1"})
    response = None
    last_exc = None
    for attempt in range(3):
        try:
            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type=file.content_type),
                    system_prompt,
                ],
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    max_output_tokens=8192,
                ),
            )
            break
        except Exception as exc:
            last_exc = exc
            err_str = str(exc)
            if "503" in err_str or "UNAVAILABLE" in err_str:
                logger.warning("Gemini 503 (attempt %d/3), retrying in %ds...", attempt+1, (attempt+1)*5)
                time.sleep((attempt + 1) * 5)
            else:
                logger.exception("Gemini API call failed")
                raise HTTPException(status_code=502, detail=f"Gemini API error: {err_str}")
    if response is None:
        raise HTTPException(status_code=502, detail=f"Gemini API unavailable after retries: {last_exc}")

    raw_text: str = response.text or ""

    # --- parse JSON -------------------------------------------------------
    cleaned = _strip_markdown_fences(raw_text)
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        logger.error("Failed to parse Gemini response as JSON: %s", exc)
        logger.debug("Raw response: %s", raw_text[:2000])
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Gemini did not return valid JSON. Try again or refine the prompt.",
                "raw_snippet": raw_text[:500],
            },
        )

    return parsed


@app.post("/api/ai/parse-reading-image")
async def parse_reading_image(file: UploadFile = File(...)):
    """
    Same flow as parse_listening_image but uses readingPromptTemplate.
    """
    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Unsupported file type '{file.content_type}'.")

    config = await _fetch_ai_config()
    api_key: str = config.get("geminiApiKey", "").strip()
    system_prompt: str = config.get("readingPromptTemplate", "").strip()

    if not api_key:
        raise HTTPException(status_code=503, detail="Gemini API key is not configured.")
    if not system_prompt:
        raise HTTPException(status_code=503, detail="Reading prompt template is not configured.")

    image_bytes = await file.read()
    if len(image_bytes) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image file is too large (max 20 MB).")

    client = genai.Client(api_key=api_key, http_options={"api_version": "v1"})
    response = None
    last_exc = None
    for attempt in range(3):
        try:
            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type=file.content_type),
                    system_prompt,
                ],
                config=types.GenerateContentConfig(temperature=0.1, max_output_tokens=8192),
            )
            break
        except Exception as exc:
            last_exc = exc
            err_str = str(exc)
            if "503" in err_str or "UNAVAILABLE" in err_str:
                logger.warning("Gemini 503 (attempt %d/3), retrying in %ds...", attempt+1, (attempt+1)*5)
                time.sleep((attempt + 1) * 5)
            else:
                logger.exception("Gemini API call failed")
                raise HTTPException(status_code=502, detail=f"Gemini API error: {err_str}")
    if response is None:
        raise HTTPException(status_code=502, detail=f"Gemini API unavailable after retries: {last_exc}")

    raw_text: str = response.text or ""
    cleaned = _strip_markdown_fences(raw_text)
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=422,
            detail={"message": "Gemini did not return valid JSON.", "raw_snippet": raw_text[:500]},
        )

    return parsed
