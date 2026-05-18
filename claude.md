# IELTS-Mate Platform — AI Engineering Constitution

> **This file is the authoritative source of truth for all AI-assisted code generation in this repository.**
> Every instruction here is **mandatory**. Deviation requires explicit written justification in the PR.

---

## 1. Project Overview & Architecture

**Domain:** IELTS Mock Tests, Automated Grading, Learning Analytics, and Subscription Management.

**Architecture:** Microservices behind an API Gateway. Each service owns its domain completely — no cross-service direct DB access, ever.

```
[React SPA / Next.js]
        │  HTTPS
        ▼
[API Gateway :3000]  ──REST──▶  [Auth / Billing / Reading / Writing / Listening / Speaking / Exam]
        │
        └──AMQP──▶  [RabbitMQ]  ──▶  [AI Service (Python/FastAPI)]
                                           │
                                           └──▶  [Google Gemini API / PaddleOCR]
```

**Communication Rules:**
- **Synchronous (REST/HTTP):** All client-facing requests via the API Gateway.
- **Asynchronous (RabbitMQ AMQP):** All heavy internal tasks — AI grading, notifications, analytics aggregation.
- **Database-per-service:** Each microservice has its own isolated MongoDB database. No service reads another service's DB directly.

---

## 2. Tech Stack Ecosystem

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 18 (SPA) / Next.js 14 (App Router) |
| Language | **TypeScript — strict mode always** |
| Styling | Tailwind CSS v3 |
| State Management | Zustand |
| Data Fetching | TanStack Query (React Query) |
| Charts & Analytics | Recharts |
| Forms | React Hook Form + Zod |

### Backend — Core Services
| Layer | Technology |
|---|---|
| Runtime | Node.js 20 LTS |
| Framework | Express 5 |
| ODM | Mongoose 8 |
| Auth | JWT (`jsonwebtoken`) + refresh token rotation |
| Rate Limiting | Redis (`ioredis` + `express-rate-limit`) |
| Message Broker | RabbitMQ (`amqplib`) |
| Containerisation | Docker + Docker Compose |

### Backend — AI Service
| Layer | Technology |
|---|---|
| Runtime | Python 3.11 |
| Framework | FastAPI |
| Validation | Pydantic v2 |
| AI Provider | Google Gemini API (`google-generativeai`) |
| OCR | PaddleOCR |
| Async HTTP | `httpx` |

### Testing
| Layer | Technology |
|---|---|
| Unit / Integration | Jest 29 + Supertest |
| In-memory DB | `mongodb-memory-server` |
| Mocking | `jest.mock()` — never real external services in tests |
| Python | `pytest` + `httpx[asyncio]` |

---

## 3. Strict Coding Conventions — The DO's

### TypeScript (Frontend & any TS backend code)

- **ALWAYS** enable `strict: true` in `tsconfig.json`. No exceptions.
- Define explicit `interface` or `type` for every API request body, response shape, and Mongoose document.
- Use `zod` for runtime validation of all external inputs (form data, API responses).
- Prefer `type` for unions/intersections; prefer `interface` for object shapes that may be extended.

```typescript
// ✅ CORRECT
interface IReadingAttempt {
  testId: string;
  studentId: string;
  rawScore: number;
  bandScore: number;
  timeSpent: number;
  details: IAttemptDetail[];
  createdAt: Date;
}

// ❌ WRONG
const attempt: any = { ... };
```

### Node.js / Express Controllers

- **ALL** controllers must be wrapped in `try/catch` and delegate to a **centralized error handler**.
- Follow **Controller → Service → Repository** layering strictly. No DB queries in controllers.
- Use `async/await` everywhere. Never mix `.then()/.catch()` chains with `async/await`.
- All route handlers must be typed: `(req: Request, res: Response, next: NextFunction) => Promise<void>`.

```javascript
// ✅ CORRECT pattern
export const createTest = async (req, res, next) => {
  try {
    const result = await readingService.createTest(req.body, req.user.id);
    res.status(201).json(result);
  } catch (err) {
    next(err); // delegates to centralized error middleware
  }
};
```

### Mongoose / Data Models

- Define schemas with **explicit types, required flags, defaults, and validators** — never rely on implicit Mongoose coercion for business logic.
- Use `timestamps: true` on every schema.
- Index fields used in query filters (`studentId`, `testId`, `createdBy`, `isPublished`).

### Architecture & Design

- Adhere to **SOLID principles**:
  - **S** — One reason to change per module.
  - **O** — Extend behaviour via config/strategy, not by modifying core logic.
  - **D** — Depend on abstractions (service interfaces), not concrete implementations.
- Use **Clean Architecture** layers: `routes → controllers → services → repositories → models`.
- Environment-specific config must live in `.env` files. Never hard-code secrets, ports, or URLs.
- Write comments explaining **why** complex logic exists, not what it does.

```javascript
// ✅ WHY comment
// Gemini occasionally returns band scores like 6.5 when the rubric caps at 6.0;
// clamp here to prevent downstream leaderboard corruption.
const clampedBand = Math.min(score, MAX_BAND_FOR_SKILL[skill]);
```

---

## 4. Anti-Patterns — The DON'Ts

| # | Rule | Rationale |
|---|---|---|
| 1 | **DO NOT** write monolithic code — keep all services fully decoupled | A change in one service must never require changes in another |
| 2 | **DO NOT** use `any` type in TypeScript | Defeats the entire purpose of type safety |
| 3 | **DO NOT** delete existing comments or code unless explicitly instructed | In-progress work and contextual notes must be preserved |
| 4 | **DO NOT** use generic placeholder data | Always use realistic IELTS domain mock data (passages, questions, band scores) |
| 5 | **DO NOT** query another service's MongoDB database directly | Use REST calls through the API Gateway or async messages via RabbitMQ |
| 6 | **DO NOT** put business logic in routes or middleware | Routes are wiring only; logic lives in the service layer |
| 7 | **DO NOT** swallow errors silently | Every `catch` block must either re-throw or call `next(err)` |
| 8 | **DO NOT** commit `.env` files or secrets | Use `.env.example` with placeholder values only |
| 9 | **DO NOT** bypass `--no-verify` hooks without approval | Pre-commit checks exist for a reason |
| 10 | **DO NOT** use `console.log` in production code | Use the configured logger (`winston` / `pino`) with structured JSON output |

---

## 5. AI Behaviour Guidelines

These rules govern how the AI assistant **must behave** in every session.

### Bug Fixes
1. **Briefly explain the root cause** before writing any code fix (2–4 sentences max).
2. Then provide the corrected code block only — not the entire file, unless the full file is needed.
3. If the bug has a systemic cause (e.g., a missing DB index causing timeouts), flag it explicitly.

### Code Generation
- **Only output the specific code blocks that changed.** Prefix each block with its file path.
- If generating a new file, output the complete file.
- When multiple files change, list them in dependency order (models → services → controllers → routes → tests).

### Test Generation
- **Always cover both Happy Paths AND Edge/Failure Cases** for every Acceptance Criterion.
- Tests must use realistic IELTS domain data — real passage text snippets, authentic question types (`multiple-choice`, `true-false-not-given`, `fill-in-the-blank`), valid band score ranges (1.0–9.0).
- Mock all external services (`@google/generative-ai`, `amqplib`, Redis) — never call real APIs in tests.
- Structure test files as: `describe(feature) → describe(scenario) → it(expected behaviour)`.

### Responses
- Do not add unrequested features, refactors, or "improvements".
- Do not add docstrings or comments to code that was not touched.
- Be terse. Skip preamble and summaries unless asked.

---

## 6. Domain Knowledge — IELTS Context

The AI must understand this domain deeply to produce useful output.

**Band Score Scale:** 1.0 (lowest) → 9.0 (highest), in 0.5 increments.

**Four Skills:** Reading, Writing, Listening, Speaking.

**Reading Test Structure:**
- 1–3 passages per test, each with 13–14 questions.
- Question types: `multiple-choice`, `true-false-not-given`, `yes-no-not-given`, `matching-headings`, `fill-in-the-blank`, `short-answer`.
- Raw score (0–40) maps to band score via a fixed IELTS conversion table.

**Writing Task Structure:**
- Task 1: Describe a graph/chart/diagram (~150 words, 20 min).
- Task 2: Academic essay (~250 words, 40 min).
- AI grading criteria: Task Achievement, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy.

**Listening Test Structure:**
- 4 sections, 40 questions, 30 min audio.
- Dictation, MCQ, gap-fill.

**Speaking Test Structure:**
- Part 1: Introduction (4–5 min).
- Part 2: Cue card monologue (3–4 min).
- Part 3: Discussion (4–5 min).

---

## 7. Service Registry

| Service | Port | DB | Key Responsibilities |
|---|---|---|---|
| `api-gateway` | 3000 | — | Auth proxy, rate limiting, request routing |
| `auth-service` | 3001 | `ielts_auth_db` | Register, login, JWT issue/refresh, API key quotas |
| `reading-service` | 3002 | `ielts_reading_db` | Test CRUD, submission, auto-grading, attempts |
| `writing-service` | 3003 | `ielts_writing_db` | Task submission, AI grading via RabbitMQ |
| `listening-service` | 3004 | `ielts_listening_db` | Audio tests, dictation grading |
| `speaking-service` | 3005 | `ielts_speaking_db` | Recording upload, AI scoring |
| `exam-service` | 3006 | `ielts_exam_db` | Full mock exams combining all skills |
| `billing-service` | 3007 | `ielts_billing_db` | Subscriptions, plan enforcement, quotas |
| `payment-service` | 3008 | `ielts_payment_db` | Payment gateway integration |
| `notification-service` | 3009 | `ielts_notification_db` | Email/push via RabbitMQ consumers |
| `cloud-media-service` | 3010 | `ielts_media_db` | File uploads, CDN, presigned URLs |
| `lesson-service` | 3011 | `ielts_lesson_db` | Course content, video lessons |
| `ai-service` | 8000 | — | FastAPI, Gemini grading, OCR extraction |

---

## 8. Environment & Operational Standards

- **Node services:** `npm ci` (never `npm install`) in Docker. Lockfile must be committed.
- **Python service:** `pip install --no-cache-dir -r requirements.txt` in Docker.
- **Health checks:** Every service must expose `GET /health` returning `{ status: "ok", service: "<name>", timestamp: ISO8601 }`.
- **Logging:** Structured JSON only. Fields: `level`, `message`, `service`, `requestId`, `timestamp`.
- **Secrets:** Injected via environment variables only. No `.env` in Docker images.
- **Content-Type:** All JSON payloads must use `Content-Type: application/json; charset=utf-8`.

---

*Last updated: 2026-05-15 — Authorised by Principal Architect.*
