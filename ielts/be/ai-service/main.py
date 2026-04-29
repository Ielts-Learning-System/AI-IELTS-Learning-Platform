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
from contextlib import asynccontextmanager

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


async def _call_gemini_with_pdf(
    api_key: str, pdf_bytes: bytes, system_prompt: str
) -> dict:
    """
    Upload the PDF bytes to Gemini and return the parsed JSON response.
    Retries up to 3 times on transient 503 errors.
    Uses asyncio.to_thread so the synchronous SDK call does not block the event loop.
    """
    client = genai.Client(api_key=api_key, http_options={"api_version": "v1"})

    def _generate():
        return client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[
                types.Part.from_bytes(data=pdf_bytes, mime_type="application/pdf"),
                system_prompt,
            ],
            config=types.GenerateContentConfig(
                temperature=0.1,
                max_output_tokens=32768,
            ),
        )

    response = None
    last_exc: Exception | None = None
    for attempt in range(3):
        try:
            response = await asyncio.to_thread(_generate)
            break
        except Exception as exc:
            last_exc = exc
            err_str = str(exc)
            if "503" in err_str or "UNAVAILABLE" in err_str:
                wait = (attempt + 1) * 8
                logger.warning(
                    "Gemini 503 on PDF call (attempt %d/3), retrying in %ds…", attempt + 1, wait
                )
                await asyncio.sleep(wait)
            else:
                logger.exception("Gemini PDF call failed")
                raise HTTPException(status_code=502, detail=f"Gemini API error: {err_str}")

    if response is None:
        raise HTTPException(
            status_code=502, detail=f"Gemini API unavailable after retries: {last_exc}"
        )

    raw_text: str = response.text or ""
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

    # --- fetch API key from auth-service ---------------------------------
    config = await _fetch_ai_config()
    api_key: str = config.get("geminiApiKey", "").strip()
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Gemini API key is not configured. Please set it in Admin → AI Manager.",
        )

    # --- choose system prompt based on test type -------------------------
    system_prompt = (
        _PDF_READING_SYSTEM_PROMPT
        if testType == "reading"
        else _PDF_LISTENING_SYSTEM_PROMPT
    )

    # --- call Gemini -----------------------------------------------------
    result = await _call_gemini_with_pdf(api_key, pdf_bytes, system_prompt)

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

_ANSWER_KEY_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
}


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
    api_key: str,
    test_bytes: bytes,
    test_mime: str,
    system_prompt: str,
    key_bytes: bytes | None = None,
    key_mime: str | None = None,
) -> dict:
    """
    Send one (or two) files to Gemini for advanced extraction.
    Uses EXTRACT_MODEL (default gemini-1.5-pro) for superior accuracy on dense text.
    Retries up to 3 times on 503 / UNAVAILABLE errors.
    """
    # gemini-1.5-pro (and 1.5-flash) are only accessible on v1beta, not v1.
    # Use v1beta unconditionally here; v1 models (2.x) also work on v1beta.
    client = genai.Client(api_key=api_key, http_options={"api_version": "v1beta"})

    contents: list = [types.Part.from_bytes(data=test_bytes, mime_type=test_mime)]
    if key_bytes and key_mime:
        contents.append(types.Part.from_bytes(data=key_bytes, mime_type=key_mime))
    contents.append(system_prompt)

    def _generate():
        return client.models.generate_content(
            model=EXTRACT_MODEL,
            contents=contents,
            config=types.GenerateContentConfig(
                temperature=0.1,
                max_output_tokens=32768,
            ),
        )

    response = None
    last_exc: Exception | None = None
    for attempt in range(3):
        try:
            response = await asyncio.to_thread(_generate)
            break
        except Exception as exc:
            last_exc = exc
            err_str = str(exc)
            if "503" in err_str or "UNAVAILABLE" in err_str:
                wait = (attempt + 1) * 10
                logger.warning(
                    "Gemini 503 on extract (attempt %d/3), retrying in %ds…", attempt + 1, wait
                )
                await asyncio.sleep(wait)
            else:
                logger.exception("Gemini extract call failed")
                raise HTTPException(status_code=502, detail=f"Gemini API error: {err_str}")

    if response is None:
        raise HTTPException(
            status_code=502,
            detail=f"Gemini API unavailable after retries: {last_exc}",
        )

    raw_text: str = response.text or ""
    cleaned = _strip_markdown_fences(raw_text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        logger.error("Failed to parse Gemini extract response as JSON: %s", exc)
        logger.debug("Raw snippet: %s", raw_text[:3000])
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Gemini did not return valid JSON. Try selecting a specific Part instead of All, or use a cleaner PDF scan.",
                "raw_snippet": raw_text[:800],
            },
        )


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

    Model: EXTRACT_MODEL env var (default: gemini-1.5-pro) for superior
    accuracy on dense Cambridge IELTS text.

    Form fields:
      testType       – "reading" | "listening"             (default: "reading")
      partSelection  – "All" | "Part 1" | "Part 2" | ...  (default: "All")
      testFile       – required PDF (max 50 MB)
      answerKeyFile  – optional PDF or image (max 20 MB)
    """
    # ── validate testType ────────────────────────────────────────────────
    if testType not in ("reading", "listening"):
        raise HTTPException(
            status_code=400, detail="testType must be 'reading' or 'listening'."
        )

    # ── validate partSelection ───────────────────────────────────────────
    valid_parts = {"All", "Part 1", "Part 2", "Part 3", "Part 4"}
    if partSelection not in valid_parts:
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

    # ── read answerKeyFile (optional) ────────────────────────────────────
    key_bytes: bytes | None = None
    key_mime: str | None = None

    if answerKeyFile and (answerKeyFile.filename or "").strip():
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

    logger.info(
        "extract-test | type=%s | part=%s | testFile=%s (%d KB) | hasKey=%s | model=%s",
        testType,
        partSelection,
        testFile.filename,
        len(test_bytes) // 1024,
        key_bytes is not None,
        EXTRACT_MODEL,
    )

    # ── fetch Gemini API key ─────────────────────────────────────────────
    config = await _fetch_ai_config()
    api_key: str = config.get("geminiApiKey", "").strip()
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Gemini API key is not configured. Please set it in Admin → AI Manager.",
        )

    # ── build prompt ─────────────────────────────────────────────────────
    system_prompt = _build_extract_prompt(
        part_selection=partSelection,
        test_type=testType,
        has_answer_key=key_bytes is not None,
    )

    # ── call Gemini ──────────────────────────────────────────────────────
    result = await _call_gemini_extract(
        api_key=api_key,
        test_bytes=test_bytes,
        test_mime="application/pdf",
        system_prompt=system_prompt,
        key_bytes=key_bytes,
        key_mime=key_mime,
    )

    logger.info(
        "extract-test | success | parts=%d | questions=%d",
        len(result.get("parts", [])),
        sum(len(p.get("questions", [])) for p in result.get("parts", [])),
    )
    return result

