"""
extractor_service.py
====================

Two-stage IELTS PDF extraction pipeline.

  Stage 1 – PaddleOCR PP-Structure:
      PDF bytes → page images (pdf2image) → layout-aware OCR → clean text

  Stage 2 – Google Gemini (text-only):
      clean text + structured prompt → validated JSON

Usage (standalone):
    uvicorn extractor_service:app --host 0.0.0.0 --port 3014

Usage (mounted into main.py):
    from extractor_service import router as extractor_router
    app.include_router(extractor_router)

New system dependencies (add to Dockerfile):
    RUN apt-get install -y poppler-utils libgl1 libglib2.0-0

New Python dependencies (add to requirements.txt):
    paddlepaddle==2.6.2
    paddleocr>=2.7.3
    pdf2image>=1.17.0
    numpy>=1.26.0
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import textwrap
from typing import Any

import httpx
import numpy as np
from fastapi import APIRouter, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from pdf2image import convert_from_bytes

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

AUTH_SERVICE_URL    = os.getenv("AUTH_SERVICE_INTERNAL_URL", "http://auth-service:3001")
INTERNAL_SECRET     = os.getenv("INTERNAL_SECRET", "")
GEMINI_MODEL        = os.getenv("EXTRACT_MODEL", "gemini-1.5-flash")

PDF_SIZE_LIMIT      = 50 * 1024 * 1024   # 50 MB
OCR_DPI             = int(os.getenv("OCR_DPI", "200"))
OCR_CONF_THRESHOLD  = float(os.getenv("OCR_CONF_THRESHOLD", "0.55"))
GEMINI_CHAR_LIMIT   = 60_000             # guard against context-window overflow

VALID_TEST_TYPES    = frozenset(("reading", "listening", "writing", "speaking"))


# ---------------------------------------------------------------------------
# Stage 1 – OCR engine (lazy singletons; init once per process)
# ---------------------------------------------------------------------------

_pp_structure: Any = None   # paddleocr.PPStructure
_fallback_ocr: Any = None   # paddleocr.PaddleOCR


def _init_engines() -> None:
    """Import and initialise PaddleOCR engines exactly once."""
    global _pp_structure, _fallback_ocr
    if _pp_structure is not None:
        return

    try:
        from paddleocr import PPStructure, PaddleOCR  # noqa: PLC0415 (deferred import)
    except ImportError as exc:
        raise RuntimeError(
            "PaddleOCR is not installed. Add 'paddlepaddle' and 'paddleocr' to requirements.txt."
        ) from exc

    logger.info("Initialising PP-Structure layout engine (lang=en, recovery=True) …")
    _pp_structure = PPStructure(
        table=False,     # skip table-cell parsing — we want running text
        ocr=True,
        lang="en",
        show_log=False,
        recovery=True,   # reconstruct reading order; requires paddleocr >= 2.6
    )

    logger.info("Initialising PaddleOCR fallback engine …")
    _fallback_ocr = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)

    logger.info("OCR engines ready.")


# ---------------------------------------------------------------------------
# Stage 1 helpers – single-page extraction
# ---------------------------------------------------------------------------

def _extract_page_text(img_array: np.ndarray) -> str:
    """
    Run PP-Structure on one page image; return the text in reading order.

    PP-Structure divides a page into typed regions (title, text, list, table, figure).
    With recovery=True the result may contain a top-level `res["text"]` string per region.
    Without recovery (older builds) `res` is a list of line-level OCR tuples.
    Both formats are handled.
    Falls back to flat PaddleOCR when PP-Structure raises.
    """
    _init_engines()

    try:
        regions: list[dict] = _pp_structure(img_array)  # type: ignore[operator]
    except Exception as exc:
        logger.warning("PP-Structure failed, falling back to flat OCR: %s", exc)
        return _flat_ocr(img_array)

    if not regions:
        return _flat_ocr(img_array)

    # Sort top-to-bottom, left-to-right by region bounding box
    def _region_sort_key(r: dict) -> tuple[int, int]:
        bb = r.get("bbox") or [0, 0, 0, 0]
        return int(bb[1]), int(bb[0])

    segments: list[str] = []

    for region in sorted(regions, key=_region_sort_key):
        rtype = str(region.get("type", "")).lower()

        if rtype == "figure":
            segments.append("[FIGURE]")
            continue
        if rtype == "table":
            segments.append("[TABLE]")
            continue

        res = region.get("res")
        if not res:
            continue

        # ── recovery=True path: res is a dict with key "text" ────────────
        if isinstance(res, dict):
            text = str(res.get("text") or "").strip()
            if text:
                prefix = "# " if rtype == "title" else ""
                segments.append(f"{prefix}{text}")
            continue

        # ── legacy path: res is a list of [[pts], (text, conf)] tuples ───
        if isinstance(res, list):
            line_texts: list[str] = []
            for item in res:
                if not (isinstance(item, (list, tuple)) and len(item) == 2):
                    continue
                text_info = item[1]
                if not (isinstance(text_info, (list, tuple)) and len(text_info) >= 2):
                    continue
                text, conf = str(text_info[0]), float(text_info[1])
                if conf >= OCR_CONF_THRESHOLD and text.strip():
                    line_texts.append(text.strip())

            if line_texts:
                prefix = "# " if rtype == "title" else ""
                segments.append(f"{prefix}{' '.join(line_texts)}")

    return "\n\n".join(segments)


def _flat_ocr(img_array: np.ndarray) -> str:
    """
    Fallback: use bare PaddleOCR and sort detections by y-centre to approximate
    reading order.
    """
    _init_engines()
    try:
        result = _fallback_ocr.ocr(img_array, cls=True)  # type: ignore[union-attr]
    except Exception as exc:
        logger.error("Flat OCR failed: %s", exc)
        return ""

    lines: list[tuple[float, str]] = []
    for page_res in result or []:
        for item in page_res or []:
            if not (isinstance(item, (list, tuple)) and len(item) == 2):
                continue
            pts, text_info = item
            if not (isinstance(text_info, (list, tuple)) and len(text_info) >= 2):
                continue
            text, conf = str(text_info[0]), float(text_info[1])
            if conf >= OCR_CONF_THRESHOLD and text.strip():
                y_centre = sum(float(p[1]) for p in pts) / max(len(pts), 1)
                lines.append((y_centre, text.strip()))

    lines.sort(key=lambda t: t[0])
    return "\n".join(t[1] for t in lines)


# ---------------------------------------------------------------------------
# Stage 1 – public async entry point
# ---------------------------------------------------------------------------

async def pdf_to_text(pdf_bytes: bytes) -> str:
    """
    Convert a PDF (bytes) to multi-page OCR text.
    All blocking OCR/PDF work is wrapped in asyncio.to_thread so the FastAPI
    event loop is never blocked.
    """

    def _blocking() -> str:
        images = convert_from_bytes(pdf_bytes, dpi=OCR_DPI, fmt="jpeg")
        page_texts: list[str] = []
        for page_num, img in enumerate(images, start=1):
            img_arr = np.asarray(img)
            text = _extract_page_text(img_arr)
            page_texts.append(f"=== PAGE {page_num} ===\n{text}")
        return "\n\n".join(page_texts)

    return await asyncio.to_thread(_blocking)


# ---------------------------------------------------------------------------
# Stage 2 – Gemini key-pool helpers (mirrors the pattern in main.py)
# ---------------------------------------------------------------------------

async def _fetch_active_key() -> dict:
    url = f"{AUTH_SERVICE_URL}/api/internal/api-keys/active"
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(url, headers={"x-internal-secret": INTERNAL_SECRET})
            resp.raise_for_status()
            data = resp.json()
            return {"keyId": data["keyId"], "keyString": data["keyString"]}
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=503,
                detail=f"Key pool error ({exc.response.status_code}). Check auth-service.",
            ) from exc
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=503, detail=f"Auth-service unreachable: {exc}"
            ) from exc


async def _rotate_key(exhausted_key_id: str) -> dict:
    url = f"{AUTH_SERVICE_URL}/api/internal/api-keys/rotate"
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.post(
                url,
                json={"exhaustedKeyId": exhausted_key_id},
                headers={"x-internal-secret": INTERNAL_SECRET},
            )
            resp.raise_for_status()
            data = resp.json()
            if data.get("allExhausted"):
                raise HTTPException(
                    status_code=503,
                    detail="All Gemini API keys are exhausted. Add new keys or wait for quota reset.",
                )
            return {"keyId": data["keyId"], "keyString": data["keyString"]}
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=503, detail=f"Auth-service unreachable during rotation: {exc}"
            ) from exc


def _is_quota_error(exc: Exception) -> bool:
    msg = str(exc).upper()
    return "RESOURCE_EXHAUSTED" in msg or "429" in msg or "QUOTA" in msg


async def _call_gemini_text(prompt: str) -> str:
    """
    Send a plain-text prompt to Gemini with automatic key-pool rotation on quota
    exhaustion. Retries up to 4 times across rotations + transient 503 back-offs.
    """
    key_info = await _fetch_active_key()
    rotated = False

    for attempt in range(4):
        gemini_client = genai.Client(
            api_key=key_info["keyString"],
            http_options={"api_version": "v1"},
        )

        def _generate() -> Any:
            return gemini_client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.05,         # near-zero: deterministic JSON output
                    max_output_tokens=16_384,
                ),
            )

        try:
            response = await asyncio.to_thread(_generate)
            return response.text or ""

        except Exception as exc:
            # ── Quota → rotate once ──────────────────────────────────────
            if _is_quota_error(exc) and not rotated:
                logger.warning(
                    "Quota exhausted on key %s (attempt %d). Rotating…",
                    key_info["keyId"], attempt + 1,
                )
                rotated = True
                key_info = await _rotate_key(key_info["keyId"])
                continue

            # ── Transient 503 → back-off ─────────────────────────────────
            if "503" in str(exc) or "UNAVAILABLE" in str(exc):
                wait = (attempt + 1) * 6
                logger.warning("Gemini 503 (attempt %d), retrying in %ds…", attempt + 1, wait)
                await asyncio.sleep(wait)
                continue

            raise HTTPException(
                status_code=502, detail=f"Gemini API error: {exc}"
            ) from exc

    raise HTTPException(
        status_code=502, detail="Gemini unavailable after all retries."
    )


# ---------------------------------------------------------------------------
# Stage 2 – JSON schemas embedded in prompts
# ---------------------------------------------------------------------------

_SCHEMA_READING_LISTENING = """\
{
  "parts": [
    {
      "partNumber": 1,
      "title": "string  (passage or section title)",
      "description": "string  (full verbatim passage / context; may contain HTML)",
      "questions": [
        {
          "questionNumber": 1,
          "type": "multiple_choice | fill_blank | matching | true_false",
          "questionText": "string  (full question stem; use _____ for blanks)",
          "options": ["A. option text", "B. option text"],
          "answer": "string  (correct answer or key letter)"
        }
      ]
    }
  ]
}"""

_SCHEMA_WRITING = """\
{
  "tasks": [
    {
      "taskNumber": 1,
      "title": "string  (concise title derived from the prompt)",
      "type": "Task 1 | Task 2",
      "category": "Chart/Graph | Map/Diagram | Process | Letter | Essay | Mixed",
      "contentHtml": "<p>Full task prompt HTML — include every instruction sentence.</p>",
      "wordLimit": 150
    }
  ]
}"""

_SCHEMA_SPEAKING = """\
{
  "parts": [
    {
      "partNumber": 1,
      "title": "Introduction & Interview",
      "questions": ["string question 1", "string question 2"]
    },
    {
      "partNumber": 2,
      "title": "Individual Long Turn",
      "cueCard": {
        "topic": "string",
        "prompts": ["Describe ...", "You should say:", "  - bullet 1", "  - bullet 2"],
        "prepTime": 60,
        "speakTime": 120
      }
    },
    {
      "partNumber": 3,
      "title": "Two-way Discussion",
      "questions": ["string follow-up 1", "string follow-up 2"]
    }
  ]
}"""

_OUTPUT_RULES = """\
STRICT OUTPUT RULES — violations will break downstream parsing:
  • Return ONLY raw JSON — absolutely no markdown fences (```), no commentary.
  • Do NOT invent questions, passages, or tasks that are not in the source text.
  • Preserve all original question numbers exactly.
  • fill_blank: represent each blank as exactly _____ (5 underscores).
  • multiple_choice options MUST be prefixed: "A. text", "B. text", etc.
  • true_false options array: ["TRUE","FALSE","NOT GIVEN"] or ["YES","NO","NOT GIVEN"].
  • If a section is absent from the PDF return an empty array for that field."""


def _build_gemini_prompt(test_type: str, extracted_text: str) -> str:
    """Construct the Stage 2 prompt by injecting OCR text + type-specific instructions."""

    type_spec: dict[str, str] = {
        "reading": (
            "Extract ALL IELTS Academic Reading passages and their associated questions.\n"
            "Each passage becomes one `part`. Reproduce the full passage verbatim inside "
            "`description` — do NOT summarise.\n"
            "Map every question to one of: multiple_choice, fill_blank, matching, true_false.\n\n"
            f"Required JSON schema:\n{_SCHEMA_READING_LISTENING}"
        ),
        "listening": (
            "Extract ALL four IELTS Listening sections (Parts 1–4).\n"
            "Put the situation/context text (e.g. 'Two students discuss…') in `description`.\n"
            "Map every question to: fill_blank, multiple_choice, or matching.\n\n"
            f"Required JSON schema:\n{_SCHEMA_READING_LISTENING}"
        ),
        "writing": (
            "Extract both IELTS Writing tasks (Task 1 and Task 2).\n"
            "Put the full task prompt — including any chart/diagram description or letter rubric — "
            "inside `contentHtml` as valid HTML.\n\n"
            f"Required JSON schema:\n{_SCHEMA_WRITING}"
        ),
        "speaking": (
            "Extract the complete IELTS Speaking test:\n"
            "  • Part 1  – examiner introduction + interview questions\n"
            "  • Part 2  – cue card (topic + bullet prompts + timing)\n"
            "  • Part 3  – two-way discussion questions\n\n"
            f"Required JSON schema:\n{_SCHEMA_SPEAKING}"
        ),
    }

    # Truncate OCR text to stay within Gemini context window
    safe_text = extracted_text[:GEMINI_CHAR_LIMIT]
    if len(extracted_text) > GEMINI_CHAR_LIMIT:
        logger.warning(
            "OCR text truncated from %d → %d chars for Gemini prompt.",
            len(extracted_text), GEMINI_CHAR_LIMIT,
        )

    return textwrap.dedent(f"""\
        You are a professional IELTS test digitiser.
        The text below was extracted via PaddleOCR from an IELTS {test_type.title()} test PDF.
        Your task: parse the raw OCR text into structured JSON.

        {type_spec[test_type]}

        {_OUTPUT_RULES}

        <EXTRACTED_OCR_TEXT>
        {safe_text}
        </EXTRACTED_OCR_TEXT>

        JSON output:""")


def _parse_gemini_json(raw: str, test_type: str) -> dict:
    """Strip markdown fences if present and parse JSON; raise 422 on invalid output."""
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip(), flags=re.MULTILINE)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        logger.error("Gemini returned non-JSON for testType=%s: %s", test_type, exc)
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Gemini returned invalid JSON after the OCR stage.",
                "hint": (
                    "The OCR text may be too noisy. "
                    "Try a higher-DPI scan or set OCR_DPI=300 in the environment."
                ),
                "raw_snippet": raw[:600],
            },
        ) from exc


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

router = APIRouter()


@router.post("/api/extract/ielts-pdf")
async def extract_ielts_pdf(
    file: UploadFile = File(...),
    testType: str = Form("reading"),
    partSelection: str = Form("All"),  # forwarded to prompt; reserved for future filtering
) -> dict:
    """
    **Two-stage IELTS PDF extraction**

    | Stage | Tool | Input | Output |
    |-------|------|-------|--------|
    | 1 | PaddleOCR PP-Structure | PDF pages → JPEG images | Reading-order text |
    | 2 | Google Gemini (text-only) | OCR text + structured prompt | JSON |

    **Form fields**
    - `file`          – PDF upload (≤ 50 MB)
    - `testType`      – `reading` | `listening` | `writing` | `speaking`  *(default: reading)*
    - `partSelection` – `All` | `Part 1` … *(default: All; informs the Gemini prompt)*
    """
    # ── Validate inputs ──────────────────────────────────────────────────
    if testType not in VALID_TEST_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"testType must be one of: {', '.join(sorted(VALID_TEST_TYPES))}.",
        )

    ct = (file.content_type or "").lower()
    fn = (file.filename or "").lower()
    if ct not in {"application/pdf", "application/x-pdf"} and not fn.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted (.pdf).")

    pdf_bytes = await file.read()

    if len(pdf_bytes) > PDF_SIZE_LIMIT:
        raise HTTPException(
            status_code=413,
            detail=f"PDF too large ({len(pdf_bytes) // (1024 * 1024)} MB). Maximum is 50 MB.",
        )
    if len(pdf_bytes) < 512:
        raise HTTPException(status_code=400, detail="PDF appears empty or corrupt.")

    logger.info(
        "extract-ielts-pdf | START | testType=%s | file=%s | size=%d KB",
        testType, file.filename, len(pdf_bytes) // 1024,
    )

    # ── Stage 1: PaddleOCR ───────────────────────────────────────────────
    try:
        ocr_text = await pdf_to_text(pdf_bytes)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    if not ocr_text.strip():
        raise HTTPException(
            status_code=422,
            detail=(
                "OCR produced no text. The PDF may be a very-low-resolution scan. "
                "Try setting OCR_DPI=300 or using a cleaner source file."
            ),
        )

    logger.info(
        "extract-ielts-pdf | OCR_DONE | testType=%s | chars=%d",
        testType, len(ocr_text),
    )

    # ── Stage 2: Gemini text-only ────────────────────────────────────────
    prompt = _build_gemini_prompt(testType, ocr_text)
    raw_response = await _call_gemini_text(prompt)
    result = _parse_gemini_json(raw_response, testType)

    # Attach pipeline metadata for debugging / audit
    result["_meta"] = {
        "pipeline":      "paddleocr+gemini",
        "testType":      testType,
        "partSelection": partSelection,
        "ocrChars":      len(ocr_text),
        "geminiModel":   GEMINI_MODEL,
    }

    logger.info(
        "extract-ielts-pdf | SUCCESS | testType=%s | ocrChars=%d",
        testType, len(ocr_text),
    )
    return result


# ---------------------------------------------------------------------------
# Standalone app (uvicorn extractor_service:app)
# ---------------------------------------------------------------------------

app = FastAPI(
    title="IELTS Extractor – Two-Stage Pipeline",
    description="PaddleOCR PP-Structure → Google Gemini text-only extraction.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("extractor_service:app", host="0.0.0.0", port=3014, reload=False)
