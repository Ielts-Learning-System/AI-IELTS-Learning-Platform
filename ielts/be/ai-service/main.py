"""
IELTS AI Service – FastAPI
Handles all Generative AI tasks (image parsing, feedback generation, etc.)
using Google Gemini models.
"""

import json
import os
import re
import time
import asyncio
import logging
import base64
import hashlib
import io
import tempfile
from contextlib import asynccontextmanager
from typing import Any

# Optional OCR libraries – service starts normally even when not installed
try:
    import numpy as np
    from pdf2image import convert_from_bytes as _pdf2images
    _OCR_LIBS_AVAILABLE = True
except ImportError:
    _OCR_LIBS_AVAILABLE = False
    np = None          # type: ignore[assignment]
    _pdf2images = None # type: ignore[assignment]

import httpx
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
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
    Fetch prompt templates + legacy single-key config from the auth-service
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


async def _fetch_active_key() -> dict:
    """
    Fetch the current ACTIVE key from the ApiKey pool in auth-service.
    Returns { keyId, keyString }.
    Raises HTTPException(503) when no key is configured.
    """
    url = f"{AUTH_SERVICE_INTERNAL_URL}/api/internal/api-keys/active"
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(url, headers={"x-internal-secret": INTERNAL_SECRET})
            if resp.status_code == 503:
                raise HTTPException(
                    status_code=503,
                    detail=resp.json().get(
                        "message",
                        "No active Gemini API key configured. Please add keys in Admin → AI Manager.",
                    ),
                )
            resp.raise_for_status()
            return resp.json()  # { keyId, keyString }
        except HTTPException:
            raise
        except Exception as exc:
            logger.error("Failed to fetch active API key: %s", exc)
            raise HTTPException(status_code=503, detail="Auth-service unreachable.")


async def _rotate_key(exhausted_key_id: str) -> dict:
    """
    Tell auth-service to mark exhaustedKeyId as EXHAUSTED and promote the next
    AVAILABLE key.  Returns { keyId, keyString } of the new ACTIVE key.
    Raises HTTPException(503) when all keys are exhausted.
    """
    url = f"{AUTH_SERVICE_INTERNAL_URL}/api/internal/api-keys/rotate"
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.post(
                url,
                headers={"x-internal-secret": INTERNAL_SECRET},
                json={"exhaustedKeyId": exhausted_key_id},
            )
            data = resp.json()
            if resp.status_code == 503:
                raise HTTPException(
                    status_code=503,
                    detail=data.get(
                        "message",
                        "Tất cả API key đã hết quota. Vui lòng thêm key mới hoặc chờ reset lúc 00:00.",
                    ),
                )
            resp.raise_for_status()
            return data  # { keyId, keyString }
        except HTTPException:
            raise
        except Exception as exc:
            logger.error("Failed to rotate API key: %s", exc)
            raise HTTPException(status_code=503, detail="Auth-service unreachable during key rotation.")


def _strip_markdown_fences(text: str) -> str:
    """Remove ```json ... ``` or ``` ... ``` wrappers that Gemini sometimes adds."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _is_quota_exhausted_error(err: Exception | str) -> bool:
    """Best-effort detection for Gemini quota exhaustion responses."""
    raw = str(err).upper()
    return (
        "RESOURCE_EXHAUSTED" in raw
        or "QUOTA" in raw
        or "429" in raw
        or "RATE LIMIT" in raw
    )


async def _mark_quota_exhausted(message: str) -> None:
    """
    Legacy: notify auth-service that current key is exhausted (used by old code paths).
    Best-effort; never raises.
    """
    url = f"{AUTH_SERVICE_INTERNAL_URL}/api/internal/system-config/quota-exhausted"
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            await client.post(
                url,
                headers={"x-internal-secret": INTERNAL_SECRET},
                json={"message": message[:400]},
            )
        except Exception:
            logger.warning("Failed to notify auth-service about exhausted quota", exc_info=True)


async def _call_gemini_contents_with_rotation(
    contents: list,
    *,
    max_output_tokens: int = 8192,
    temperature: float = 0.1,
    use_thread: bool = False,
) -> str:
    """
    Central Gemini call wrapper with automatic key rotation on quota exhaustion.

    Algorithm:
      1. Fetch ACTIVE key from pool.
      2. Try Gemini call.
         a. On 429 / RESOURCE_EXHAUSTED → rotate to next AVAILABLE key, retry once.
         b. On 503 UNAVAILABLE → linear back-off, retry up to 3 times.
         c. Any other error → raise immediately.
      3. If all keys exhausted → raise HTTPException(503).

    Returns the raw text from Gemini response.
    use_thread=True: wraps synchronous _generate() in asyncio.to_thread (needed for PDF calls).
    """
    key_info = await _fetch_active_key()
    rotated = False  # allow at most one rotation per request

    for attempt in range(4):  # max 4 tries across all keys + retries
        api_key = key_info["keyString"]
        key_id = key_info["keyId"]
        client_obj = genai.Client(api_key=api_key, http_options={"api_version": "v1"})

        def _generate():
            return client_obj.models.generate_content(
                model=GEMINI_MODEL,
                contents=contents,
                config=types.GenerateContentConfig(
                    temperature=temperature,
                    max_output_tokens=max_output_tokens,
                ),
            )

        try:
            if use_thread:
                response = await asyncio.to_thread(_generate)
            else:
                response = _generate()
            return response.text or ""

        except Exception as exc:
            err_str = str(exc)

            # ── Quota exhausted → rotate key ──────────────────────────────
            if _is_quota_exhausted_error(exc):
                logger.warning(
                    "Quota exhausted on key %s (attempt %d). Rotating…", key_id, attempt + 1
                )
                if rotated:
                    # We already rotated once; all keys must be exhausted
                    raise HTTPException(
                        status_code=503,
                        detail="Tất cả API key đã hết quota. Vui lòng thêm key mới hoặc chờ reset lúc 00:00.",
                    )
                rotated = True
                key_info = await _rotate_key(key_id)
                logger.info("Rotated to new key %s. Retrying…", key_info["keyId"])
                continue  # retry with new key

            # ── Transient 503 → back-off ──────────────────────────────────
            if "503" in err_str or "UNAVAILABLE" in err_str:
                wait = (attempt + 1) * 6
                logger.warning(
                    "Gemini 503 (attempt %d/3), retrying in %ds…", attempt + 1, wait
                )
                await asyncio.sleep(wait)
                continue

            # ── Any other error → fail fast ───────────────────────────────
            logger.exception("Gemini API call failed on attempt %d", attempt + 1)
            raise HTTPException(status_code=502, detail=f"Gemini API error: {err_str}")

    raise HTTPException(status_code=502, detail="Gemini API unavailable after all retries.")


def _guess_image_mime(data: bytes) -> str | None:
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    if data.startswith(b"RIFF") and data[8:12] == b"WEBP":
        return "image/webp"
    return None


def _extract_pdf_image_data_urls(pdf_bytes: bytes, max_images: int = 2) -> list[str]:
    """
    Extract image blobs directly from PDF so writing prompts can keep original charts/diagrams.
    Returns data URLs ordered by image size (largest first).

    Applies rotation correction:
      - PIL ImageOps.exif_transpose()  — fixes JPEG EXIF orientation flag
      - PDF page /Rotate attribute     — counter-rotates the raw XObject bytes so the image
        appears in the same orientation as it does when viewed in a PDF reader
    """
    try:
        from pypdf import PdfReader
    except Exception:
        logger.warning("pypdf is not available; skipping PDF image extraction")
        return []

    # Pillow is a required transitive dep of pdf2image — safe to import.
    try:
        from PIL import Image, ImageOps
        import io as _bio
        _pil_ok = True
    except ImportError:
        _pil_ok = False

    candidates: list[tuple[int, str]] = []
    seen: set[str] = set()

    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        for page in reader.pages[:8]:
            # PDF /Rotate: "rotate the page this many degrees CW when displaying".
            # To make the extracted XObject appear the same way, we apply the same CW rotation.
            page_rotate = int(page.get("/Rotate", 0) or 0) % 360

            images = getattr(page, "images", []) or []
            for image in images:
                data = getattr(image, "data", None)
                if not data or len(data) < 8_000:
                    continue

                mime = _guess_image_mime(data)
                if not mime:
                    continue

                digest = hashlib.sha1(data).hexdigest()
                if digest in seen:
                    continue
                seen.add(digest)

                # Keep payload bounded to avoid huge DB records.
                if len(data) > 2_500_000:
                    continue

                # ── Rotation correction via PIL ───────────────────────────
                if _pil_ok:
                    try:
                        img = Image.open(_bio.BytesIO(data))
                        # Honour JPEG EXIF orientation (e.g. phone camera shots)
                        img = ImageOps.exif_transpose(img)
                        # Counter-rotate to match how a PDF reader displays the page.
                        # PIL.rotate is CCW; for a CW rotation of N degrees use -N.
                        if page_rotate == 90:
                            img = img.rotate(-90, expand=True)
                        elif page_rotate == 180:
                            img = img.rotate(180, expand=True)
                        elif page_rotate == 270:
                            img = img.rotate(90, expand=True)
                        buf = _bio.BytesIO()
                        fmt = "JPEG" if mime == "image/jpeg" else "PNG"
                        save_kw: dict = {"quality": 90} if fmt == "JPEG" else {}
                        img.save(buf, format=fmt, **save_kw)
                        data = buf.getvalue()
                        mime = f"image/{fmt.lower()}"
                    except Exception:
                        pass  # fall back to raw data if PIL processing fails
                # ─────────────────────────────────────────────────────────

                b64 = base64.b64encode(data).decode("ascii")
                candidates.append((len(data), f"data:{mime};base64,{b64}"))
    except Exception:
        logger.warning("Failed to extract embedded images from PDF", exc_info=True)
        return []

    candidates.sort(key=lambda item: item[0], reverse=True)
    return [url for _, url in candidates[:max_images]]


def _inject_writing_images(result: dict, image_urls: list[str]) -> dict:
    """Inject extracted PDF images into writing Task 1 HTML when no <img> is present."""
    if not image_urls:
        return result

    tasks = result.get("tasks")
    if not isinstance(tasks, list):
        return result

    for idx, task in enumerate(tasks):
        if not isinstance(task, dict):
            continue

        content_html = str(task.get("contentHtml") or "")
        if not content_html or "<img" in content_html.lower():
            continue

        task_number = int(task.get("taskNumber") or 0)
        # Prioritize attaching visuals to Task 1 (chart/map/process), then fallback by index.
        if task_number == 1:
            picked = image_urls[0]
        elif idx < len(image_urls):
            picked = image_urls[idx]
        else:
            continue

        image_block = (
            '<figure class="source-image" style="margin:12px 0;">'
            f'<img src="{picked}" alt="Extracted visual from source PDF" '
            'style="max-width:100%;height:auto;border:1px solid #e2e8f0;border-radius:10px;" />'
            '</figure>'
        )

        placeholder_pattern = re.compile(r'<div class="chart-placeholder">.*?</div>', re.IGNORECASE | re.DOTALL)
        if placeholder_pattern.search(content_html):
            content_html = placeholder_pattern.sub(f"{image_block}\\g<0>", content_html, count=1)
        else:
            # Keep original text fully intact; only prepend the image block.
            content_html = f"{image_block}{content_html}"

        task["contentHtml"] = content_html

    result["tasks"] = tasks
    return result


# ---------------------------------------------------------------------------
# OCR Stage 1 – PaddleOCR PP-Structure helpers
# ---------------------------------------------------------------------------

_pp_structure: Any = None
_fallback_ocr: Any = None


def _init_ocr_engines() -> None:
    """Lazy-init PaddleOCR engines exactly once per process."""
    global _pp_structure, _fallback_ocr
    if _pp_structure is not None:
        return
    if not _OCR_LIBS_AVAILABLE:
        raise RuntimeError(
            "OCR libraries not installed. Add paddlepaddle, paddleocr, pdf2image to requirements.txt."
        )
    from paddleocr import PPStructure, PaddleOCR  # noqa: PLC0415
    logger.info("Initialising PP-Structure (lang=en, recovery=True) …")
    _pp_structure = PPStructure(table=False, ocr=True, lang="en", show_log=False, recovery=True)
    _fallback_ocr = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
    logger.info("OCR engines ready.")


def _ocr_page(img_arr: Any) -> str:
    """Extract text from one page image array via PP-Structure with flat-OCR fallback."""
    _init_ocr_engines()

    def _sort_key(r: dict) -> tuple[int, int]:
        bb = r.get("bbox") or [0, 0, 0, 0]
        return int(bb[1]), int(bb[0])

    try:
        regions: list[dict] = _pp_structure(img_arr)  # type: ignore[operator]
    except Exception as exc:
        logger.warning("PP-Structure failed, falling back to flat OCR: %s", exc)
        return _ocr_page_flat(img_arr)

    if not regions:
        return _ocr_page_flat(img_arr)

    segments: list[str] = []
    for region in sorted(regions, key=_sort_key):
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
        prefix = "# " if rtype == "title" else ""
        if isinstance(res, dict):
            text = str(res.get("text") or "").strip()
            if text:
                segments.append(f"{prefix}{text}")
        elif isinstance(res, list):
            line_texts: list[str] = []
            for item in res:
                if not (isinstance(item, (list, tuple)) and len(item) == 2):
                    continue
                info = item[1]
                if not (isinstance(info, (list, tuple)) and len(info) >= 2):
                    continue
                txt, conf = str(info[0]), float(info[1])
                if conf >= OCR_CONF_THRESHOLD and txt.strip():
                    line_texts.append(txt.strip())
            if line_texts:
                segments.append(f"{prefix}{' '.join(line_texts)}")
    return "\n\n".join(segments)


def _ocr_page_flat(img_arr: Any) -> str:
    """Flat PaddleOCR fallback sorted by y-centre."""
    _init_ocr_engines()
    try:
        result = _fallback_ocr.ocr(img_arr, cls=True)  # type: ignore[union-attr]
    except Exception as exc:
        logger.error("Flat OCR failed: %s", exc)
        return ""
    lines: list[tuple[float, str]] = []
    for page_res in result or []:
        for item in page_res or []:
            if not (isinstance(item, (list, tuple)) and len(item) == 2):
                continue
            pts, info = item
            if not (isinstance(info, (list, tuple)) and len(info) >= 2):
                continue
            txt, conf = str(info[0]), float(info[1])
            if conf >= OCR_CONF_THRESHOLD and txt.strip():
                y = sum(float(p[1]) for p in pts) / max(len(pts), 1)
                lines.append((y, txt.strip()))
    lines.sort(key=lambda t: t[0])
    return "\n".join(t[1] for t in lines)


async def _pdf_to_text(pdf_bytes: bytes) -> str:
    """Convert PDF bytes → multi-page OCR text (runs in thread pool)."""
    def _blocking() -> str:
        images = _pdf2images(pdf_bytes, dpi=OCR_DPI, fmt="jpeg")  # type: ignore[operator]
        pages: list[str] = []
        for i, img in enumerate(images, 1):
            arr = np.asarray(img)  # type: ignore[operator]
            pages.append(f"=== PAGE {i} ===\n{_ocr_page(arr)}")
        return "\n\n".join(pages)
    return await asyncio.to_thread(_blocking)


# ---------------------------------------------------------------------------
# OCR Stage 2 – text-only Gemini call + text-injection prompts
# ---------------------------------------------------------------------------

async def _call_gemini_text_only(prompt: str) -> tuple[dict, dict]:
    """
    Send a plain-text prompt to Gemini (EXTRACT_MODEL, v1beta) with key-pool rotation.
    Returns (parsed_dict, usage_dict).
    """
    key_info = await _fetch_active_key()
    rotated = False
    usage: dict = {}

    for attempt in range(4):
        api_key = key_info["keyString"]
        key_id = key_info["keyId"]
        client_obj = genai.Client(api_key=api_key, http_options={"api_version": "v1beta"})

        def _generate() -> Any:
            return client_obj.models.generate_content(
                model=EXTRACT_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(temperature=0.05, max_output_tokens=32768),
            )

        try:
            response = await asyncio.to_thread(_generate)
        except Exception as exc:
            err_str = str(exc)
            if _is_quota_exhausted_error(exc):
                logger.warning("Quota exhausted on key %s (text attempt %d). Rotating…", key_id, attempt + 1)
                if rotated:
                    raise HTTPException(
                        status_code=503,
                        detail="Tất cả API key đã hết quota. Vui lòng thêm key mới hoặc chờ reset lúc 00:00.",
                    )
                rotated = True
                key_info = await _rotate_key(key_id)
                continue
            if "503" in err_str or "UNAVAILABLE" in err_str:
                wait = (attempt + 1) * 10
                await asyncio.sleep(wait)
                continue
            raise HTTPException(status_code=502, detail=f"Gemini API error: {err_str}")
        else:
            try:
                meta = response.usage_metadata
                if meta:
                    usage = {
                        "promptTokenCount": getattr(meta, "prompt_token_count", 0) or 0,
                        "candidatesTokenCount": getattr(meta, "candidates_token_count", 0) or 0,
                        "totalTokenCount": getattr(meta, "total_token_count", 0) or 0,
                    }
            except Exception:
                pass
            raw = response.text or ""
            cleaned = _strip_markdown_fences(raw)
            try:
                return json.loads(cleaned), usage
            except json.JSONDecodeError as exc:
                logger.error("Gemini text-only response is not valid JSON: %s", exc)
                raise HTTPException(
                    status_code=422,
                    detail={
                        "message": "Gemini returned invalid JSON after the OCR stage.",
                        "hint": "The OCR text may be too noisy. Try OCR_DPI=300 or a higher-resolution scan.",
                        "raw_snippet": raw[:800],
                    },
                )

    raise HTTPException(status_code=502, detail="Gemini unavailable after all retries.")


_OCR_TEXT_RULES = """
STRICT OUTPUT RULES:
  • Return ONLY raw JSON — no markdown fences, no commentary.
  • Do NOT invent content that is absent from the source text.
  • Preserve all original question numbers exactly.
  • fill_blank: represent each blank as exactly _____ (5 underscores).
  • multiple_choice options MUST be prefixed: "A. text", "B. text", etc.
  • true_false options array must be ["TRUE","FALSE","NOT GIVEN"] or ["YES","NO","NOT GIVEN"].
  • Ignore OCR artefacts (stray characters, broken hyphens, mis-spaced words)."""


def _build_ocr_text_prompt(
    test_type: str,
    part_selection: str,
    ocr_text: str,
    ocr_key_text: str | None,
) -> str:
    """Build a text-only Gemini prompt by injecting OCR text into type-specific instructions."""
    safe_text = ocr_text[:GEMINI_CHAR_LIMIT]
    if len(ocr_text) > GEMINI_CHAR_LIMIT:
        logger.warning("OCR text truncated %d → %d chars", len(ocr_text), GEMINI_CHAR_LIMIT)

    key_block = ""
    if ocr_key_text:
        safe_key = ocr_key_text[:10_000]
        key_block = f"\n\n<ANSWER_KEY_TEXT>\n{safe_key}\n</ANSWER_KEY_TEXT>"

    if test_type == "writing":
        instructions = _PDF_WRITING_SYSTEM_PROMPT
    elif test_type == "speaking":
        instructions = _PDF_SPEAKING_SYSTEM_PROMPT
    else:
        instructions = _build_extract_prompt(
            part_selection=part_selection,
            test_type=test_type,
            has_answer_key=ocr_key_text is not None,
        )

    return (
        f"You are a professional IELTS test digitiser.\n"
        f"The text below was extracted via PaddleOCR from an IELTS {test_type.title()} test PDF.\n"
        f"Parse it into structured JSON following the rules and schema below.\n\n"
        f"<EXTRACTED_OCR_TEXT>\n{safe_text}\n</EXTRACTED_OCR_TEXT>"
        f"{key_block}\n\n"
        f"{instructions}\n"
        f"{_OCR_TEXT_RULES}\n\n"
        f"JSON output:"
    )


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


class GradeWritingRequest(BaseModel):
    task_type: str          # e.g. "Academic Task 1", "Task 2"
    prompt_text: str        # The writing question / prompt shown to the student
    student_essay: str      # The student's submitted essay text
    target_band: float = 7.0  # Desired band for the improved rewrite


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
    Uses the key-pool rotation mechanism automatically on quota exhaustion.
    """
    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file.content_type}'. Use JPEG, PNG, WEBP, or GIF.",
        )

    config = await _fetch_ai_config()
    system_prompt: str = config.get("listeningPromptTemplate", "").strip()
    if not system_prompt:
        raise HTTPException(
            status_code=503,
            detail="Listening prompt template is not configured. Please set it in Admin → AI Manager.",
        )

    image_bytes = await file.read()
    if len(image_bytes) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image file is too large (max 20 MB).")

    raw_text = await _call_gemini_contents_with_rotation(
        [types.Part.from_bytes(data=image_bytes, mime_type=file.content_type), system_prompt],
        max_output_tokens=8192,
    )

    cleaned = _strip_markdown_fences(raw_text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        logger.error("Failed to parse Gemini response as JSON: %s", exc)
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Gemini did not return valid JSON. Try again or refine the prompt.",
                "raw_snippet": raw_text[:500],
            },
        )


@app.post("/api/ai/parse-reading-image")
async def parse_reading_image(file: UploadFile = File(...)):
    """Same flow as parse_listening_image but uses readingPromptTemplate."""
    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Unsupported file type '{file.content_type}'.")

    config = await _fetch_ai_config()
    system_prompt: str = config.get("readingPromptTemplate", "").strip()
    if not system_prompt:
        raise HTTPException(status_code=503, detail="Reading prompt template is not configured.")

    image_bytes = await file.read()
    if len(image_bytes) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image file is too large (max 20 MB).")

    raw_text = await _call_gemini_contents_with_rotation(
        [types.Part.from_bytes(data=image_bytes, mime_type=file.content_type), system_prompt],
        max_output_tokens=8192,
    )

    cleaned = _strip_markdown_fences(raw_text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=422,
            detail={"message": "Gemini did not return valid JSON.", "raw_snippet": raw_text[:500]},
        )


# ---------------------------------------------------------------------------
# PDF-based extraction — system prompts (hardcoded, not stored in DB)
# ---------------------------------------------------------------------------

_PDF_READING_SYSTEM_PROMPT = """You are a professional IELTS test digitizer specializing in Cambridge IELTS Academic Reading tests.

Carefully analyze the COMPLETE IELTS Reading test contained in this PDF. Extract EVERY passage and EVERY question.

═══════════════════════════════════════════════════════
ABSOLUTE OUTPUT RULE: Return ONLY a single raw JSON object.
  • NO markdown code fences (no ```json or ```)
  • NO explanation text before or after the JSON
  • NO comments inside the JSON
═══════════════════════════════════════════════════════

━━━ PASSAGE EXTRACTION (the "description" field for each part) ━━━
Convert the full reading passage body into clean, readable HTML:
  • <h2 class="passage-title"> for the main passage title
  • <h3> for any sub-headings within the passage
  • <p> for each paragraph; if the paragraph has a letter label (A, B, C…) prepend it: <p><strong>A</strong> paragraph text…</p>
  • <strong> for bold or italicised words in the original
  • <ul><li> for bulleted/numbered lists within the passage
  • Preserve ALL original text exactly — do NOT paraphrase or abbreviate
  • Do NOT include question text, section headings like "Questions 1–13", or answer blanks in the description

━━━ QUESTION EXTRACTION RULES ━━━
Map every Cambridge question type to one of these four types:

1. NOTE / TABLE / SUMMARY / SENTENCE / FLOW-CHART COMPLETION
   → type: "fill_blank"
   • questionText: the full sentence/note with a visible blank shown as _____
     e.g. "The leaves of the tree are _____ in shape."
   • options: []
   • correctAnswer: ""   ← ALWAYS leave empty

2. MULTIPLE CHOICE (A / B / C / D or A / B / C)
   → type: "multiple_choice"
   • questionText: the full question stem
   • options: ["A. …", "B. …", "C. …"] (include letter prefix)
   • correctAnswer: ""

3. TRUE / FALSE / NOT GIVEN  or  YES / NO / NOT GIVEN
   → type: "matching"
   • questionText: the statement verbatim from the PDF
   • options: ["TRUE", "FALSE", "NOT GIVEN"]  or  ["YES", "NO", "NOT GIVEN"]
   • correctAnswer: ""

4. MATCHING HEADINGS / FEATURES / SENTENCE ENDINGS / PARAGRAPH INFORMATION
   → type: "matching"
   • questionText: the item that needs to be matched
     (e.g. "Paragraph A", "Question 14", or the sentence beginning)
   • options: copy ALL choices from the answer box (headings / features / endings)
   • correctAnswer: ""

IMPORTANT:
  • Include a "questionNumber" integer field matching the original Cambridge number (1, 2, 3 … 40)
  • Never invent answers. correctAnswer must always be ""
  • Include imageUrl: "" on every question object

━━━ JSON SCHEMA ━━━
{
  "title": "IELTS Academic Reading — [infer test name, e.g. Cambridge 15 Test 1]",
  "description": "Reading test instructions",
  "parts": [
    {
      "partNumber": 1,
      "title": "READING PASSAGE 1 — [passage title exactly as printed]",
      "description": "<h2 class=\\"passage-title\\">Passage Title</h2><p>Full passage HTML…</p>",
      "questions": [
        {
          "questionNumber": 1,
          "questionText": "The leaves of the tree are _____ in shape.",
          "type": "fill_blank",
          "options": [],
          "imageUrl": "",
          "correctAnswer": ""
        },
        {
          "questionNumber": 5,
          "questionText": "In the Middle Ages, most Europeans knew where nutmeg was grown.",
          "type": "matching",
          "options": ["TRUE", "FALSE", "NOT GIVEN"],
          "imageUrl": "",
          "correctAnswer": ""
        }
      ]
    }
  ]
}"""


_PDF_LISTENING_SYSTEM_PROMPT = """You are a professional IELTS test digitizer specializing in Cambridge IELTS Listening test question sheets.

IMPORTANT: This PDF contains ONLY the QUESTION SHEET — there is no audio. Extract the visual layout of every part and every numbered question.

═══════════════════════════════════════════════════════
ABSOLUTE OUTPUT RULE: Return ONLY a single raw JSON object.
  • NO markdown code fences (no ```json or ```)
  • NO explanation text before or after the JSON
  • NO comments inside the JSON
═══════════════════════════════════════════════════════

━━━ DESCRIPTION FIELD (visual task layout as HTML) ━━━
For each Part, reproduce the COMPLETE visual layout of the task box as HTML so a student can read it without the original PDF:

• NOTES / FORM COMPLETION:
  Use <ul> with <li> for each bullet. Render blanks as <strong>[N]</strong> _____ where N is the question number.
  Wrap the whole box in <div class="task-box"><strong>Section Title</strong>…</div>
  Example:
    <div class="task-box">
      <strong>Bankside Recruitment Agency</strong>
      <ul>
        <li>Address of agency: 497 Eastside, Docklands</li>
        <li>Name of agent: Becky <strong>1</strong> _____</li>
        <li>Best to call her in the <strong>2</strong> _____</li>
      </ul>
      <strong>Typical jobs</strong>
      <ul>
        <li>Must have good <strong>3</strong> _____ skills</li>
      </ul>
    </div>

• TABLE COMPLETION:
  Use <table border="1" cellpadding="4" style="border-collapse:collapse;width:100%">
  Put blanks as <strong>[N]</strong> _____ in the appropriate cells.

• MULTIPLE CHOICE SECTIONS:
  Use <p> for the scenario/context above the questions. Each question is handled in the questions array, NOT in the description.

• MAP / PLAN / DIAGRAM:
  Use <p> to describe the diagram layout and list all visible label positions and existing text.

• Use <strong> for all bold section headings.
• Preserve ALL written text visible in the question sheet exactly.

━━━ QUESTION EXTRACTION RULES ━━━

1. FILL-IN-BLANK (note / form / table / sentence / flow-chart completion)
   → type: "fill_blank"
   • questionText: the surrounding sentence giving context for THAT blank
     e.g. "Name of agent: Becky _____"  or  "Jobs are usually for at least one _____"
   • options: []
   • correctAnswer: ""   ← ALWAYS leave empty

2. MULTIPLE CHOICE (A / B / C)
   → type: "multiple_choice"
   • questionText: the full question text exactly as printed
   • options: ["A. …", "B. …", "C. …"]
   • correctAnswer: ""

3. MATCHING / LETTERED BOX (choose from a box of labelled options A–H etc.)
   → type: "matching"
   • questionText: the item to be matched (e.g. "the eldest child", "21")
   • options: copy ALL lettered options from the box (e.g. ["A. outgoing", "B. selfish", …])
   • correctAnswer: ""

IMPORTANT:
  • Include a "questionNumber" integer field for each question
  • audioUrl: "" on every part object
  • imageUrl: "" on every question object
  • Never invent or guess answers. correctAnswer is always ""

━━━ JSON SCHEMA ━━━
{
  "title": "IELTS Listening Test — [infer test name, e.g. Cambridge 15 Test 1]",
  "description": "IELTS Listening Test. Questions based on recorded conversations.",
  "parts": [
    {
      "partNumber": 1,
      "title": "Part 1 — [infer context from the task, e.g. Bankside Recruitment Agency]",
      "audioUrl": "",
      "description": "<div class=\\"task-box\\"><strong>Bankside Recruitment Agency</strong><ul><li>Address: 497 Eastside, Docklands</li><li>Name of agent: Becky <strong>1</strong> _____</li></ul></div>",
      "questions": [
        {
          "questionNumber": 1,
          "questionText": "Name of agent: Becky _____",
          "type": "fill_blank",
          "options": [],
          "imageUrl": "",
          "correctAnswer": ""
        }
      ]
    }
  ]
}"""


# ---------------------------------------------------------------------------
# PDF extraction endpoint
# ---------------------------------------------------------------------------

PDF_SIZE_LIMIT = 50 * 1024 * 1024  # 50 MB


async def _call_gemini_with_pdf(pdf_bytes: bytes, system_prompt: str) -> dict:
    """
    Upload PDF bytes to Gemini and return the parsed JSON response.
    Uses _call_gemini_contents_with_rotation for automatic key-pool rotation.
    """
    raw_text = await _call_gemini_contents_with_rotation(
        [types.Part.from_bytes(data=pdf_bytes, mime_type="application/pdf"), system_prompt],
        max_output_tokens=32768,
        use_thread=True,
    )
    cleaned = _strip_markdown_fences(raw_text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        logger.error("Failed to parse Gemini PDF response as JSON: %s", exc)
        logger.debug("Raw snippet: %s", raw_text[:3000])
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Gemini did not return valid JSON. Try uploading a cleaner scan or a different page range.",
                "raw_snippet": raw_text[:800],
            },
        )


@app.post("/api/ai/parse-pdf-test")
async def parse_pdf_test(
    file: UploadFile = File(...),
    testType: str = Form("reading"),
):
    """
    Accept a PDF of an IELTS Reading or Listening test and return structured JSON.

    Form fields:
      • file     – the PDF file (max 50 MB)
      • testType – "reading" or "listening"  (default: "reading")

    The endpoint:
      1. Validates the file is a PDF and within size limit.
      2. Fetches the live Gemini API key from auth-service.
      3. Sends the PDF bytes + hardcoded system prompt to Gemini.
      4. Returns clean JSON matching the unified test schema.
    """
    # --- validate --------------------------------------------------------
    if testType not in ("reading", "listening"):
        raise HTTPException(
            status_code=400,
            detail="testType must be 'reading' or 'listening'.",
        )

    allowed_mime = {"application/pdf", "application/x-pdf"}
    content_type = (file.content_type or "").lower()
    filename = (file.filename or "").lower()
    if content_type not in allowed_mime and not filename.endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are accepted. Please upload a .pdf file.",
        )

    # --- read + size check -----------------------------------------------
    pdf_bytes = await file.read()
    if len(pdf_bytes) > PDF_SIZE_LIMIT:
        raise HTTPException(
            status_code=413,
            detail=f"PDF is too large ({len(pdf_bytes) // (1024*1024)} MB). Maximum is 50 MB.",
        )
    if len(pdf_bytes) < 512:
        raise HTTPException(status_code=400, detail="The uploaded file appears to be empty or corrupt.")

    logger.info(
        "parse-pdf-test | testType=%s | file=%s | size=%d KB",
        testType,
        file.filename,
        len(pdf_bytes) // 1024,
    )

    # --- choose system prompt based on test type -------------------------
    system_prompt = (
        _PDF_READING_SYSTEM_PROMPT
        if testType == "reading"
        else _PDF_LISTENING_SYSTEM_PROMPT
    )

    # --- call Gemini (key pool rotation handled inside) ------------------
    result = await _call_gemini_with_pdf(pdf_bytes, system_prompt)

    logger.info(
        "parse-pdf-test | success | parts=%d",
        len(result.get("parts", [])),
    )
    return result


# ---------------------------------------------------------------------------
# Advanced extraction endpoint  (gemini-1.5-pro, verbatim + answer-key merge)
# ---------------------------------------------------------------------------

EXTRACT_MODEL = os.getenv("EXTRACT_MODEL", "gemini-2.5-flash")
EXTRACT_FILE_SIZE_LIMIT = 50 * 1024 * 1024   # 50 MB  – test PDF
EXTRACT_KEY_SIZE_LIMIT  = 20 * 1024 * 1024   # 20 MB  – answer key

# Two-stage OCR pipeline config
OCR_ENABLED         = os.getenv("OCR_ENABLED", "false").lower() in ("1", "true", "yes")
OCR_DPI             = int(os.getenv("OCR_DPI", "200"))
OCR_CONF_THRESHOLD  = float(os.getenv("OCR_CONF_THRESHOLD", "0.55"))
GEMINI_CHAR_LIMIT   = int(os.getenv("GEMINI_CHAR_LIMIT", "60000"))

_ANSWER_KEY_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
}

# ---------------------------------------------------------------------------
# Writing PDF system prompt
# ---------------------------------------------------------------------------

_PDF_WRITING_SYSTEM_PROMPT = """You are a professional IELTS Writing test digitizer.

Carefully analyze the IELTS Writing test contained in this PDF and extract Task 1 and Task 2 prompts.

═══════════════════════════════════════════════════════
ABSOLUTE OUTPUT RULE: Return ONLY a single raw JSON object.
  • NO markdown code fences (no ```json or ```)
  • NO explanation text before or after the JSON
  • NO comments inside the JSON
═══════════════════════════════════════════════════════

━━━ TASK EXTRACTION RULES ━━━
Extract up to 2 writing tasks from the document.

TASK 1 (Academic or General Training):
  • Academic Task 1: Describes a graph, chart, table, map, diagram, or process.
  • General Training Task 1: A formal or informal letter.
  • taskNumber: 1
  • title: A concise title derived from the prompt (e.g., "Academic Task 1: Bar Chart – Energy Sources")
  • type: "Task 1"
  • category: One of "Chart/Graph", "Map/Diagram", "Process", "Letter", or "Mixed"
  • contentHtml: The COMPLETE task prompt as HTML, including:
      - <p> for each paragraph of instructions
      - If there is a chart/graph/table: describe it in a <div class="chart-placeholder"> with all visible data labels, axes, and values
      - If there is a letter scenario: reproduce the scenario text in full
      - <ul><li> for bullet instructions
      - <strong> for bold text
      - Include word count instruction (e.g., "Write at least 150 words.")
  • minWords: 150

TASK 2 (Essay):
  • taskNumber: 2
  • title: A concise title derived from the essay topic
  • type: "Task 2"
  • category: One of "Opinion", "Discussion", "Problem-Solution", "Advantage-Disadvantage", "Mixed"
  • contentHtml: The COMPLETE task prompt as HTML
      - <p> for the topic statement and each instruction paragraph
      - <strong> for key instruction phrases
      - Include word count instruction (e.g., "Write at least 250 words.")
  • minWords: 250

━━━ JSON SCHEMA ━━━
{
  "testTitle": "[Inferred test title, e.g. 'IELTS Academic Writing — Cambridge 15 Test 1']",
  "tasks": [
    {
      "taskNumber": 1,
      "title": "Academic Task 1: Bar Chart – Electricity Production",
      "type": "Task 1",
      "category": "Chart/Graph",
      "contentHtml": "<p>The bar chart below shows the amount of electricity produced...</p><div class=\\"chart-placeholder\\"><p>[Chart: Bar chart showing electricity production by country (TWh), years 2000 and 2010. Countries: France, Germany, UK, USA. Values: France 2000=540, 2010=570; Germany 2000=580, 2010=610; UK 2000=375, 2010=380; USA 2000=4100, 2010=4320]</p></div><p>Summarise the information by selecting and reporting the main features, and make comparisons where relevant.</p><p><strong>Write at least 150 words.</strong></p>",
      "minWords": 150
    },
    {
      "taskNumber": 2,
      "title": "Task 2: Technology and Social Isolation",
      "type": "Task 2",
      "category": "Discussion",
      "contentHtml": "<p>Some people believe that modern technology has made people more isolated from each other. Others argue that it has brought people closer together.</p><p>Discuss both views and give your own opinion.</p><p><strong>Give reasons for your answer and include any relevant examples from your own knowledge or experience.</strong></p><p><strong>Write at least 250 words.</strong></p>",
      "minWords": 250
    }
  ]
}"""


# ---------------------------------------------------------------------------
# Speaking PDF system prompt
# ---------------------------------------------------------------------------

_PDF_SPEAKING_SYSTEM_PROMPT = """You are a professional IELTS Speaking test digitizer.

Carefully analyze the IELTS Speaking test material contained in this PDF and extract all three parts.

═══════════════════════════════════════════════════════
ABSOLUTE OUTPUT RULE: Return ONLY a single raw JSON object.
  • NO markdown code fences (no ```json or ```)
  • NO explanation text before or after the JSON
  • NO comments inside the JSON
═══════════════════════════════════════════════════════

━━━ PART EXTRACTION RULES ━━━

PART 1 — Introduction & Interview (Short questions about familiar topics):
  • Extract ALL individual questions as an array of plain strings.
  • Questions are typically about the candidate's home, work, studies, hobbies, interests.
  • Each string = one complete question, verbatim from the PDF.
  • Example: ["Do you work or are you a student?", "What do you enjoy most about your studies?"]

PART 2 — Individual Long Turn (Cue Card):
  • Extract the ENTIRE cue card as a single string.
  • Include the topic sentence AND all bullet points joined naturally.
  • Format: "Describe [topic]. You should say:\n• [bullet 1]\n• [bullet 2]\n• [bullet 3]\nand explain [final instruction]."
  • Include any time instructions ("You will have one minute to prepare...") if present.

PART 3 — Two-way Discussion (Follow-up discussion questions):
  • Extract ALL individual discussion questions as an array of plain strings.
  • Questions are deeper, more abstract follow-ups related to the Part 2 topic.
  • Each string = one complete question, verbatim from the PDF.

━━━ JSON SCHEMA ━━━
{
  "title": "[Inferred test title, e.g. 'IELTS Speaking Test — Topic: Daily Routines']",
  "part1": [
    "Let's talk about your home town. Where are you from?",
    "What do you like most about living there?",
    "Has your home town changed much in recent years?"
  ],
  "part2": "Describe a time when you had to make an important decision. You should say:\\n• what the decision was\\n• why you had to make this decision\\n• what the result of the decision was\\nand explain how you felt about making this decision.",
  "part3": [
    "Do you think young people find it more difficult to make decisions than older people?",
    "How has the way people make decisions changed in recent years?",
    "What kinds of decisions do governments need to make carefully?"
  ]
}"""


# ---------------------------------------------------------------------------
# Writing grading system prompt (Expert IELTS Examiner)
# ---------------------------------------------------------------------------

_WRITING_GRADING_SYSTEM_PROMPT = """\
You are an automated backend service acting as an Expert IELTS Examiner. \
Your task is to pre-grade a student essay strictly according to the official \
IELTS Writing Band Descriptors.

LANGUAGE RULE: All analysis, feedback, and explanations in the JSON output MUST \
be written in Vietnamese, except for English grammatical terms, vocabulary, and \
the essay rewrite itself.

GRADING RULES:
  • Use 0.5 band increments only (e.g. 5.0, 5.5, 6.0 … 9.0).
  • Feedback must be constructive and cite specific sentences from the student text.
  • The improved_rewrite must retain the student's original ideas but upgrade \
vocabulary, grammar, and cohesion to the requested target band.
  • Overall band = average of the four criterion bands, rounded to the nearest 0.5.

ABSOLUTE OUTPUT RULE:
  Return ONLY a valid raw JSON object — no markdown fences (no ```json), no \
commentary, no filler text before or after the JSON.

JSON SCHEMA (follow exactly):
{
  "overall_band": <number>,
  "overall_comment": "<string – Vietnamese>",
  "criteria_scores": {
    "task_response": {
      "band": <number>,
      "comment": "<string – Vietnamese>",
      "evidence": "<string – Vietnamese, quote from essay>",
      "limitation": "<string – Vietnamese>",
      "improvement": "<string – Vietnamese>"
    },
    "coherence_cohesion": {
      "band": <number>,
      "comment": "<string – Vietnamese>",
      "evidence": "<string – Vietnamese, quote from essay>",
      "limitation": "<string – Vietnamese>",
      "improvement": "<string – Vietnamese>"
    },
    "lexical_resource": {
      "band": <number>,
      "comment": "<string – Vietnamese>",
      "evidence": "<string – Vietnamese, quote from essay>",
      "limitation": "<string – Vietnamese>",
      "improvement": "<string – Vietnamese>"
    },
    "grammatical_range": {
      "band": <number>,
      "comment": "<string – Vietnamese>",
      "evidence": "<string – Vietnamese, quote from essay>",
      "limitation": "<string – Vietnamese>",
      "improvement": "<string – Vietnamese>"
    }
  },
  "vocabulary_analysis": [
    {
      "original_phrase": "<string – exact phrase from essay>",
      "evaluation": "<string – Vietnamese, e.g. Tốt / Chưa tự nhiên>",
      "suggestion": "<string – English band-7+ alternative>",
      "reason": "<string – Vietnamese>"
    }
  ],
  "grammar_analysis": [
    {
      "original_sentence": "<string – exact sentence from essay>",
      "issue": "<string – Vietnamese, e.g. Sai thì, thiếu mạo từ>",
      "correction": "<string – corrected English sentence>",
      "explanation": "<string – Vietnamese>"
    }
  ],
  "logic_and_development": {
    "task_fulfillment": "<string – Vietnamese>",
    "idea_clarity": "<string – Vietnamese>",
    "development": "<string – Vietnamese>",
    "cohesion_issues": "<string – Vietnamese>"
  },
  "quick_boost_tips": ["<string – Vietnamese>", "<string – Vietnamese>"],
  "improved_rewrite": "<string – full English rewrite at target band>"
}"""


def _build_grading_prompt(
    task_type: str,
    prompt_text: str,
    student_essay: str,
    target_band: float,
) -> str:
    """Inject student submission variables into the grading system prompt."""
    return (
        f"{_WRITING_GRADING_SYSTEM_PROMPT}\n\n"
        f"<TASK_TYPE>{task_type}</TASK_TYPE>\n\n"
        f"<WRITING_PROMPT>{prompt_text}</WRITING_PROMPT>\n\n"
        f"<STUDENT_ESSAY>{student_essay}</STUDENT_ESSAY>\n\n"
        f"<TARGET_BAND>{target_band}</TARGET_BAND>\n\n"
        "JSON output:"
    )


def _build_extract_prompt(
    part_selection: str,
    test_type: str,
    has_answer_key: bool,
) -> str:
    """Return a strict Gemini system prompt for verbatim IELTS extraction."""

    # ── scope ──────────────────────────────────────────────────────────────
    is_all = part_selection.strip().lower() == "all"
    if is_all:
        scope_desc = "ALL parts of this IELTS test document"
        scope_rule = "Extract EVERY part found in the document."
    else:
        scope_desc = f"ONLY {part_selection} of this IELTS test document"
        scope_rule = (
            f"Extract ONLY {part_selection}. "
            f"IGNORE every other part. Output exactly ONE item in the 'parts' array."
        )

    # ── file context block ─────────────────────────────────────────────────
    if has_answer_key:
        file_block = (
            "TWO files have been provided:\n"
            "  FILE 1 = The IELTS Test (question sheet / reading passages)\n"
            "  FILE 2 = The Answer Key\n"
            "\n"
            "For EVERY question extracted from FILE 1 you MUST:\n"
            "  1. Identify the question number.\n"
            "  2. Locate that exact question number in FILE 2.\n"
            "  3. Copy the answer VERBATIM into correctAnswer — preserve exact\n"
            "     formats such as: word(s), bus/train, TRUE, C, ii, 4th century.\n"
            "  4. NEVER normalize, rephrase, abbreviate, or guess an answer.\n"
            "  5. If a question number is absent from FILE 2, set correctAnswer to \"\".\n"
        )
    else:
        file_block = (
            "ONE file has been provided — the IELTS Test.\n"
            "Set correctAnswer: \"\" for ALL questions.\n"
        )

    # ── content instructions per test type ────────────────────────────────
    if test_type == "reading":
        content_block = """\
━━━ VERBATIM PASSAGE TRANSCRIPTION ━━━
The "description" field of each part MUST contain the FULL reading passage as HTML.

STRICT RULES — VIOLATIONS ARE FORBIDDEN:
  ✗ DO NOT summarize or paraphrase any text
  ✗ DO NOT omit any paragraph, sentence, heading, or sub-heading
  ✗ DO NOT truncate long passages — reproduce them in FULL
  ✗ DO NOT add text that does not appear in the original

REQUIRED HTML STRUCTURE:
  • <h2 class="passage-title"> for the main passage title
  • <h3> for any sub-headings within the passage
  • <p> for each body paragraph
    – Lettered paragraphs (A, B, C…): <p><strong>A</strong> Full text…</p>
  • <strong> for bold or italicised text in the original
  • <ul><li> for bulleted / numbered lists inside the passage
  • <table border="1" cellpadding="4" style="border-collapse:collapse"> for tables
  • DO NOT include question stems, section headings ("Questions 1–13"), or blanks
    in description — those belong in the questions array only.

━━━ QUESTION EXTRACTION ━━━
Map every Cambridge question to exactly ONE of these types:

TYPE 1 — COMPLETION (note / table / summary / sentence / flow-chart)
  → type: "fill_blank"
  • questionText: FULL sentence from the PDF with the blank as _____
    (e.g., "The Silk Road was primarily a route for trading _____.")
  • options: []

TYPE 2 — MULTIPLE CHOICE (A/B/C or A/B/C/D)
  → type: "multiple_choice"
  • questionText: full question stem verbatim
  • options: ["A. full text", "B. full text", "C. full text"] — include letter prefix

TYPE 3 — TRUE / FALSE / NOT GIVEN   or   YES / NO / NOT GIVEN
  → type: "matching"
  • questionText: the statement verbatim
  • options: ["TRUE", "FALSE", "NOT GIVEN"] or ["YES", "NO", "NOT GIVEN"]

TYPE 4 — MATCHING (headings / features / sentence endings / paragraph information)
  → type: "matching"
  • questionText: item to be matched (e.g., "Paragraph A", "a belief about prices")
  • options: ALL choices from the answer box verbatim (e.g., ["i. The arrival of…", "ii. A shift in…"])"""

    else:  # listening
        content_block = """\
━━━ PART DESCRIPTION (visual task layout as HTML) ━━━
The "description" field MUST reproduce the COMPLETE visual layout of the question sheet.

STRICT RULES — VIOLATIONS ARE FORBIDDEN:
  ✗ DO NOT omit any text, label, table cell, or list item visible on the page
  ✗ DO NOT summarize task instructions

REQUIRED HTML PATTERNS:

NOTES / FORM / SENTENCE COMPLETION:
  <div class="task-box">
    <strong>Box Title (e.g. "Bankside Recruitment Agency")</strong>
    <ul>
      <li>Static field: already-printed value</li>
      <li>Blank field label: Becky <strong>[1]</strong> _____</li>
    </ul>
  </div>

TABLE COMPLETION:
  <table border="1" cellpadding="4" style="border-collapse:collapse;width:100%">
  Use <strong>[N]</strong> _____ in each blank cell. Preserve all column headers.

MAP / PLAN / DIAGRAM:
  <p>Describe the layout. List all visible text labels and their positions.</p>

GENERAL:
  • <strong> for ALL section headings, box titles, and bold text
  • <p> for context paragraphs shown above question groups

━━━ QUESTION EXTRACTION ━━━
TYPE 1 — FILL-IN-BLANK (form/note/table/sentence/flow-chart completion)
  → type: "fill_blank"
  • questionText: the label/sentence for THAT blank, including _____
    (e.g., "Name of agent: Becky _____")
  • options: []

TYPE 2 — MULTIPLE CHOICE (A/B/C)
  → type: "multiple_choice"
  • questionText: full question stem verbatim
  • options: ["A. text", "B. text", "C. text"]

TYPE 3 — MATCHING / LETTERED BOX
  → type: "matching"
  • questionText: the item to match
  • options: ALL lettered options from the box verbatim"""

    # ── audio field for listening schema ──────────────────────────────────
    audio_field = '"audioUrl": "",' if test_type == "listening" else ""

    return f"""\
You are a VERBATIM IELTS Test Transcriber. Your sole task is to digitize {scope_desc} \
with absolute fidelity — no summarizing, no omissions, no paraphrasing.

═══════════════════════════════════════════════════
ABSOLUTE OUTPUT RULE
Return ONLY a single raw JSON object:
  • NO markdown fences (no ``` or ```json)
  • NO explanatory text before or after the JSON
  • NO comments inside the JSON
  • Escape all double-quotes inside string values as \\"
═══════════════════════════════════════════════════

═══════════════════════════════════════════════════
SCOPE
{scope_rule}
═══════════════════════════════════════════════════

═══════════════════════════════════════════════════
FILE CONTEXT
{file_block}
═══════════════════════════════════════════════════

{content_block}

━━━ MANDATORY FIELDS ON EVERY QUESTION OBJECT ━━━
  questionNumber  — integer matching the Cambridge number exactly as printed
  questionText    — verbatim from PDF; use _____ for blanks
  type            — "fill_blank" | "multiple_choice" | "matching"
  options         — array (empty [] for fill_blank)
  imageUrl        — always ""
  correctAnswer   — verbatim from answer key if provided, else ""

━━━ JSON OUTPUT SCHEMA ━━━
{{
  "title": "[inferred name, e.g. \\"Cambridge IELTS 18 Academic Test 2\\"]",
  "description": "",
  "parts": [
    {{
      "partNumber": 1,
      "title": "[Part/Passage title exactly as printed]",
      {audio_field}
      "description": "<HTML transcription here>",
      "questions": [
        {{
          "questionNumber": 1,
          "questionText": "[verbatim text; _____ for blanks]",
          "type": "fill_blank",
          "options": [],
          "imageUrl": "",
          "correctAnswer": "[from answer key or empty string]"
        }}
      ]
    }}
  ]
}}"""


async def _call_gemini_extract(
    test_bytes: bytes,
    test_mime: str,
    system_prompt: str,
    key_bytes: bytes | None = None,
    key_mime: str | None = None,
) -> tuple[dict, dict]:
    """
    Send one (or two) files to Gemini for advanced extraction.
    Uses EXTRACT_MODEL (default gemini-2.5-flash) with v1beta API.
    Includes automatic key-pool rotation on quota exhaustion.
    Uses Google GenAI File API if file is larger than 15MB to avoid 413.
    """
    key_info = await _fetch_active_key()
    rotated = False
    usage: dict = {}

    for attempt in range(4):
        api_key = key_info["keyString"]
        key_id = key_info["keyId"]
        client_obj = genai.Client(api_key=api_key, http_options={"api_version": "v1beta"})

        def _generate():
            uploaded_files = []
            contents = []
            temp_paths = []
            
            try:
                # 1. Handle Test PDF
                if len(test_bytes) > 15 * 1024 * 1024:
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as f:
                        f.write(test_bytes)
                        temp_paths.append(f.name)
                    up_test = client_obj.files.upload(file=temp_paths[0], config={'mime_type': test_mime})
                    uploaded_files.append(up_test)
                    contents.append(up_test)
                else:
                    contents.append(types.Part.from_bytes(data=test_bytes, mime_type=test_mime))
                
                # 2. Handle Answer Key PDF (if any)
                if key_bytes and key_mime:
                    if len(key_bytes) > 15 * 1024 * 1024:
                        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as f:
                            f.write(key_bytes)
                            temp_paths.append(f.name)
                        up_key = client_obj.files.upload(file=temp_paths[-1], config={'mime_type': key_mime})
                        uploaded_files.append(up_key)
                        contents.append(up_key)
                    else:
                        contents.append(types.Part.from_bytes(data=key_bytes, mime_type=key_mime))
                
                contents.append(system_prompt)

                return client_obj.models.generate_content(
                    model=EXTRACT_MODEL,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        temperature=0.1,
                        max_output_tokens=32768,
                    ),
                )
            finally:
                for up_f in uploaded_files:
                    try:
                        client_obj.files.delete(name=up_f.name)
                    except Exception:
                        pass
                for p in temp_paths:
                    try:
                        os.unlink(p)
                    except Exception:
                        pass

        try:
            response = await asyncio.to_thread(_generate)
        except Exception as exc:
            err_str = str(exc)

            if _is_quota_exhausted_error(exc):
                logger.warning("Quota exhausted on key %s (extract attempt %d). Rotating…", key_id, attempt + 1)
                if rotated:
                    raise HTTPException(
                        status_code=503,
                        detail="Tất cả API key đã hết quota. Vui lòng thêm key mới hoặc chờ reset lúc 00:00.",
                    )
                rotated = True
                key_info = await _rotate_key(key_id)
                logger.info("Rotated to new key %s. Retrying extract…", key_info["keyId"])
                continue

            if "503" in err_str or "UNAVAILABLE" in err_str:
                wait = (attempt + 1) * 10
                logger.warning("Gemini 503 on extract (attempt %d/3), retrying in %ds…", attempt + 1, wait)
                await asyncio.sleep(wait)
                continue

            logger.exception("Gemini extract call failed")
            raise HTTPException(status_code=502, detail=f"Gemini API error: {err_str}")
        else:
            # Success – capture token usage
            try:
                meta = response.usage_metadata
                if meta:
                    usage = {
                        "promptTokenCount": getattr(meta, "prompt_token_count", 0) or 0,
                        "candidatesTokenCount": getattr(meta, "candidates_token_count", 0) or 0,
                        "totalTokenCount": getattr(meta, "total_token_count", 0) or 0,
                    }
            except Exception:
                pass

            raw_text: str = response.text or ""
            cleaned = _strip_markdown_fences(raw_text)
            try:
                return json.loads(cleaned), usage
            except json.JSONDecodeError as exc:
                logger.error("Failed to parse Gemini extract response as JSON: %s", exc)
                raise HTTPException(
                    status_code=422,
                    detail={
                        "message": "Gemini did not return valid JSON. Try selecting a specific Part instead of All, or use a cleaner PDF scan.",
                        "raw_snippet": raw_text[:800],
                    },
                )

    raise HTTPException(status_code=502, detail="Gemini API unavailable after all retries.")


@app.post("/api/ai/extract-test")
async def extract_test(
    testType: str = Form("reading"),
    partSelection: str = Form("All"),
    testFile: UploadFile = File(...),
    answerKeyFile: UploadFile | None = File(None),
):
    """
    Advanced IELTS test extraction:
      • Verbatim HTML transcription of passages / task layouts
      • Part-level scope selection (Part 1/2/3/4 or All)
      • Optional answer key PDF/image — Gemini auto-maps answers per question number

    Model: EXTRACT_MODEL env var (default: gemini-2.5-flash) for superior
    accuracy on dense Cambridge IELTS text.

    Form fields:
      testType       – "reading" | "listening" | "writing" | "speaking"  (default: "reading")
      partSelection  – "All" | "Part 1" | "Part 2" | ...                 (default: "All")
      testFile       – required PDF (max 50 MB)
      answerKeyFile  – optional PDF or image (max 20 MB), reading/listening only
    """
    # ── validate testType ────────────────────────────────────────────────
    if testType not in ("reading", "listening", "writing", "speaking"):
        raise HTTPException(
            status_code=400, detail="testType must be 'reading', 'listening', 'writing', or 'speaking'."
        )

    # ── validate partSelection (only for reading/listening) ─────────────
    valid_parts = {"All", "Part 1", "Part 2", "Part 3", "Part 4"}
    if testType in ("reading", "listening") and partSelection not in valid_parts:
        raise HTTPException(
            status_code=400,
            detail=f"partSelection must be one of: {', '.join(sorted(valid_parts))}.",
        )

    # ── validate testFile is PDF ─────────────────────────────────────────
    ct = (testFile.content_type or "").lower()
    fn = (testFile.filename or "").lower()
    if ct not in {"application/pdf", "application/x-pdf"} and not fn.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="testFile must be a PDF (.pdf).")

    # ── read testFile ────────────────────────────────────────────────────
    test_bytes = await testFile.read()
    if len(test_bytes) > EXTRACT_FILE_SIZE_LIMIT:
        raise HTTPException(
            status_code=413,
            detail=f"testFile is too large ({len(test_bytes) // (1024*1024)} MB). Maximum is 50 MB.",
        )
    if len(test_bytes) < 512:
        raise HTTPException(status_code=400, detail="testFile appears empty or corrupt.")

    # ── read answerKeyFile (optional, only for reading/listening) ────────
    key_bytes: bytes | None = None
    key_mime: str | None = None

    if testType in ("reading", "listening") and answerKeyFile and (answerKeyFile.filename or "").strip():
        key_ct = (answerKeyFile.content_type or "").lower()
        key_fn = (answerKeyFile.filename or "").lower()

        # Determine MIME type
        if key_ct in _ANSWER_KEY_MIME_TYPES:
            key_mime = key_ct
        elif key_fn.endswith(".pdf"):
            key_mime = "application/pdf"
        elif key_fn.endswith((".jpg", ".jpeg")):
            key_mime = "image/jpeg"
        elif key_fn.endswith(".png"):
            key_mime = "image/png"
        elif key_fn.endswith(".webp"):
            key_mime = "image/webp"
        else:
            raise HTTPException(
                status_code=400,
                detail="answerKeyFile must be a PDF or image (JPEG / PNG / WEBP).",
            )

        key_bytes = await answerKeyFile.read()
        if len(key_bytes) > EXTRACT_KEY_SIZE_LIMIT:
            raise HTTPException(
                status_code=413,
                detail=f"answerKeyFile is too large ({len(key_bytes) // (1024*1024)} MB). Maximum is 20 MB.",
            )

    use_ocr = OCR_ENABLED and _OCR_LIBS_AVAILABLE
    logger.info(
        "extract-test | type=%s | part=%s | file=%s (%d KB) | hasKey=%s | model=%s | ocr=%s",
        testType, partSelection, testFile.filename,
        len(test_bytes) // 1024, key_bytes is not None, EXTRACT_MODEL, use_ocr,
    )

    # ── Stage 1: PaddleOCR (when enabled and libs are installed) ─────────
    ocr_text: str | None = None
    ocr_key_text: str | None = None

    if use_ocr:
        try:
            ocr_text = await _pdf_to_text(test_bytes)
            if not ocr_text.strip():
                raise ValueError("OCR produced empty text")
            if key_bytes:
                ocr_key_text = await _pdf_to_text(key_bytes)
            logger.info(
                "extract-test | OCR_DONE | testType=%s | chars=%d | hasKeyText=%s",
                testType, len(ocr_text), ocr_key_text is not None,
            )
        except Exception as ocr_exc:
            # OCR failure is non-fatal – silently fall back to PDF-direct mode
            logger.warning(
                "extract-test | OCR_FAILED (%s) – falling back to PDF-direct mode", ocr_exc
            )
            ocr_text = None
            ocr_key_text = None

    # ── Stage 2: Gemini ───────────────────────────────────────────────────
    if ocr_text:
        # Text-only path (2-stage pipeline)
        prompt = _build_ocr_text_prompt(
            test_type=testType,
            part_selection=partSelection,
            ocr_text=ocr_text,
            ocr_key_text=ocr_key_text,
        )
        result, usage = await _call_gemini_text_only(prompt)
    else:
        # PDF-bytes path (original single-stage, automatic fallback)
        if testType == "writing":
            system_prompt = _PDF_WRITING_SYSTEM_PROMPT
        elif testType == "speaking":
            system_prompt = _PDF_SPEAKING_SYSTEM_PROMPT
        else:
            system_prompt = _build_extract_prompt(
                part_selection=partSelection,
                test_type=testType,
                has_answer_key=key_bytes is not None,
            )
        result, usage = await _call_gemini_extract(
            test_bytes=test_bytes,
            test_mime="application/pdf",
            system_prompt=system_prompt,
            key_bytes=key_bytes,
            key_mime=key_mime,
        )

    # ── Post-processing ───────────────────────────────────────────────────
    if testType == "writing":
        image_urls = _extract_pdf_image_data_urls(test_bytes)
        result = _inject_writing_images(result, image_urls)

    if testType in ("reading", "listening"):
        logger.info(
            "extract-test | success | parts=%d | questions=%d",
            len(result.get("parts", [])),
            sum(len(p.get("questions", [])) for p in result.get("parts", [])),
        )
    else:
        logger.info("extract-test | success | testType=%s", testType)

    result["_usage"] = usage
    return result


# ---------------------------------------------------------------------------
# Writing grading endpoint
# ---------------------------------------------------------------------------

@app.post("/api/ai/grade-writing")
async def grade_writing(body: GradeWritingRequest):
    """
    Pre-grade an IELTS Writing submission using the Expert Examiner prompt.

    Request body (JSON):
      task_type     – e.g. "Academic Task 1" or "Task 2"
      prompt_text   – the writing question shown to the student
      student_essay – the student's submitted essay text
      target_band   – desired band for the improved rewrite (default 7.0)

    Returns a structured JSON grading report with:
      overall_band, criteria_scores, vocabulary_analysis, grammar_analysis,
      logic_and_development, quick_boost_tips, improved_rewrite
    """
    # Basic input sanitisation
    task_type = body.task_type.strip()
    prompt_text = body.prompt_text.strip()
    student_essay = body.student_essay.strip()
    target_band = body.target_band

    if not task_type:
        raise HTTPException(status_code=400, detail="task_type must not be empty.")
    if not prompt_text:
        raise HTTPException(status_code=400, detail="prompt_text must not be empty.")
    if not student_essay:
        raise HTTPException(status_code=400, detail="student_essay must not be empty.")
    if not (1.0 <= target_band <= 9.0):
        raise HTTPException(status_code=400, detail="target_band must be between 1.0 and 9.0.")

    # Cap essay length to avoid runaway token usage
    MAX_ESSAY_CHARS = 6000
    if len(student_essay) > MAX_ESSAY_CHARS:
        raise HTTPException(
            status_code=400,
            detail=f"student_essay is too long ({len(student_essay)} chars). Maximum is {MAX_ESSAY_CHARS} characters.",
        )

    logger.info(
        "grade-writing | task_type=%s | target_band=%.1f | essay_chars=%d",
        task_type,
        target_band,
        len(student_essay),
    )

    grading_prompt = _build_grading_prompt(
        task_type=task_type,
        prompt_text=prompt_text,
        student_essay=student_essay,
        target_band=target_band,
    )

    raw_text = await _call_gemini_contents_with_rotation(
        [grading_prompt],
        max_output_tokens=8192,
        temperature=0.2,
    )

    cleaned = _strip_markdown_fences(raw_text)
    try:
        result = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        logger.error("grade-writing | Gemini returned non-JSON: %s", exc)
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Gemini did not return valid JSON. Please try again.",
                "raw_snippet": raw_text[:800],
            },
        )

    logger.info(
        "grade-writing | success | overall_band=%s",
        result.get("overall_band"),
    )
    return result

