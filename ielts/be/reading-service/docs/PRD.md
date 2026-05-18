# Product Requirements Document — Reading Service

**Service:** `reading-service`  
**Port:** `3002`  
**Database:** `ielts_reading_db`  
**Version:** 1.0  
**Last Updated:** 2026-05-15  
**Status:** Production

---

## 1. Overview

The Reading Service manages the full lifecycle of IELTS Academic Reading tests on the IELTS-Mate platform. It covers test authoring by teachers, test-taking by students, automatic grading, and performance analytics.

**Primary actors:**

| Actor | Role |
|---|---|
| `admin` | Platform administrator — full CRUD, analytics |
| `teacher` | Test creator — create/update/delete own tests, view all attempts |
| `student` | Test taker — list/view tests, submit answers, view own history |
| Guest | Unauthenticated — can browse published test list only |

---

## 2. User Stories & Acceptance Criteria

---

### Epic 1: Test Management (Teacher / Admin)

---

#### US-01 — Create a Reading Test

> **As a teacher**, I want to create a multi-passage reading test with questions, so that students can practise IELTS Academic Reading.

**Acceptance Criteria:**

| ID | Criterion | Priority |
|---|---|---|
| AC-01-1 | `POST /api/reading` with a valid `title` and at least one passage returns `201 Created` with the full test object | Must |
| AC-01-2 | Request without `title` or with an empty `passages` array returns `400 Bad Request` | Must |
| AC-01-3 | Request from a `student` role returns `403 Forbidden` | Must |
| AC-01-4 | Unauthenticated request returns `401 Unauthorized` | Must |
| AC-01-5 | `createdBy` is set automatically from the JWT payload — client cannot override it | Must |
| AC-01-6 | If `isPublished` is omitted, the controller defaults to `true` | Must |
| AC-01-7 | Each question in a passage must include `questionNumber`, `type`, `text`, `correctAnswer`; missing any returns `400` | Must |
| AC-01-8 | `type` must be one of `MULTIPLE_CHOICE`, `FILL_IN_BLANK`, `MATCHING`, `TFNG`, `YNNG`; invalid type returns `400` | Must |

---

#### US-02 — Update a Reading Test

> **As a teacher**, I want to update a test I created, so that I can fix errors or add new passages.

**Acceptance Criteria:**

| ID | Criterion | Priority |
|---|---|---|
| AC-02-1 | `PUT /api/reading/:id` by the original creator returns `200 OK` with updated data | Must |
| AC-02-2 | `PUT /api/reading/:id` by an `admin` returns `200 OK` regardless of ownership | Must |
| AC-02-3 | `PUT /api/reading/:id` by a different teacher returns `403 Forbidden` | Must |
| AC-02-4 | `PUT /api/reading/:id` with a non-existent `id` returns `404 Not Found` | Must |
| AC-02-5 | Fields not included in the request body remain unchanged | Must |
| AC-02-6 | `isPublished` can be toggled to `false` to unpublish a test | Should |

---

#### US-03 — Delete a Reading Test

> **As a teacher**, I want to delete a test I created, so that outdated tests are removed.

**Acceptance Criteria:**

| ID | Criterion | Priority |
|---|---|---|
| AC-03-1 | `DELETE /api/reading/:id` by the owner returns `200 OK` and the document is removed from DB | Must |
| AC-03-2 | `DELETE /api/reading/:id` by an `admin` returns `200 OK` | Must |
| AC-03-3 | `DELETE /api/reading/:id` by a non-owner teacher returns `403 Forbidden` | Must |
| AC-03-4 | `DELETE /api/reading/:id` for a non-existent test returns `404 Not Found` | Must |
| AC-03-5 | Subsequent `GET /api/reading/:id` for the deleted test returns `404` | Must |

---

### Epic 2: Test Discovery (Student / Guest)

---

#### US-04 — Browse Published Tests

> **As a student**, I want to list all available reading tests with pagination, so that I can choose one to practise.

**Acceptance Criteria:**

| ID | Criterion | Priority |
|---|---|---|
| AC-04-1 | `GET /api/reading?page=1&limit=10` returns `200 OK` with `data[]`, `pagination.total`, `pagination.page`, `pagination.pages` | Must |
| AC-04-2 | Each item in `data[]` includes `_id`, `title`, `description`, `isPublished`, `passageCount`, `totalQuestionCount` | Must |
| AC-04-3 | List endpoint does NOT expose `correctAnswer` or full passage `content` | Must |
| AC-04-4 | Default `page=1`, `limit=10` when query params are absent | Should |
| AC-04-5 | Guest (no token) can access the list endpoint without authentication | Must |

---

#### US-05 — View Test Details

> **As a student**, I want to view the full details of a specific test (passages and questions), so that I can read the passages and answer the questions.

**Acceptance Criteria:**

| ID | Criterion | Priority |
|---|---|---|
| AC-05-1 | `GET /api/reading/:id` returns `200 OK` with all passages and all questions | Must |
| AC-05-2 | Response includes `correctAnswer` on each question (used by UI only for review mode) | Must |
| AC-05-3 | `GET /api/reading/:id` for a non-existent `id` returns `404 Not Found` | Must |
| AC-05-4 | Guest (no token) can access the detail endpoint | Must |

---

### Epic 3: Test Submission & Auto-Grading

---

#### US-06 — Submit Full Test

> **As a student**, I want to submit all my answers at once after completing a full reading test, so that I receive an immediate band score.

**Acceptance Criteria:**

| ID | Criterion | Priority |
|---|---|---|
| AC-06-1 | `POST /api/reading/:id/submit` with a valid `studentAnswers` array returns `201 Created` with `rawScore`, `bandScore`, `details[]` | Must |
| AC-06-2 | `bandScore` is computed from `rawScore` using the official IELTS Reading conversion table (0→1.5, 39–40→9.0) | Must |
| AC-06-3 | Each item in `details[]` contains `questionIndex`, `studentAnswer`, `correctAnswer`, `isCorrect` | Must |
| AC-06-4 | Answer comparison is case-insensitive and trims whitespace | Must |
| AC-06-5 | Correct answers with alternate forms (e.g. `10/ten`) are matched against any variant | Must |
| AC-06-6 | `studentAnswers` not an array returns `400` | Must |
| AC-06-7 | Unauthenticated request returns `401`; non-student role returns `403` | Must |
| AC-06-8 | Negative or non-numeric `timeSpent` is clamped to `0` | Should |
| AC-06-9 | `passageNumber` on the attempt is `null` for full-test submissions | Must |

---

#### US-07 — Submit Single Passage

> **As a student**, I want to submit answers for one passage at a time, so that I can practise individual passages without completing the full test.

**Acceptance Criteria:**

| ID | Criterion | Priority |
|---|---|---|
| AC-07-1 | `POST /api/reading/:id/submit-passage` with valid `passageNumber` (1–3) and `studentAnswers` returns `201` with correct grading | Must |
| AC-07-2 | `passageNumber` outside 1–3 (e.g. 0, 4, −1) returns `400 Bad Request` | Must |
| AC-07-3 | `passageNumber` referencing a passage that does not exist in the test returns `404 Not Found` | Must |
| AC-07-4 | `passageNumber` stored on the `ReadingAttempt` document matches the submitted value | Must |
| AC-07-5 | Grading scope is limited to the questions in the requested passage only | Must |
| AC-07-6 | Only `student` role can call this endpoint | Must |

---

### Epic 4: History & Analytics

---

#### US-08 — Student Attempt History

> **As a student**, I want to view my past reading attempts, so that I can track my progress over time.

**Acceptance Criteria:**

| ID | Criterion | Priority |
|---|---|---|
| AC-08-1 | `GET /api/reading/my-attempts` returns `200 OK` with only the authenticated student's attempts | Must |
| AC-08-2 | Each attempt includes `testId.title` (populated), `bandScore`, `rawScore`, `timeSpent`, `createdAt` | Must |
| AC-08-3 | Student A cannot see Student B's attempts | Must |
| AC-08-4 | Unauthenticated request returns `401` | Must |
| AC-08-5 | Results are sorted by `createdAt` descending (newest first) | Should |

---

#### US-09 — Teacher / Admin: All Attempts

> **As a teacher**, I want to view all student attempts across all tests, so that I can monitor class performance.

**Acceptance Criteria:**

| ID | Criterion | Priority |
|---|---|---|
| AC-09-1 | `GET /api/reading/attempts` (teacher/admin only) returns all attempts across all tests | Must |
| AC-09-2 | `student` role calling this endpoint receives `403` | Must |
| AC-09-3 | Each record is populated with `testId.title` | Must |

---

#### US-10 — Platform Stats

> **As an admin**, I want aggregate statistics on reading attempts, so that I can monitor platform usage.

**Acceptance Criteria:**

| ID | Criterion | Priority |
|---|---|---|
| AC-10-1 | `GET /api/reading/stats` returns `totalAttempts` (integer) and `avgBandScore` (float, 2 dp) | Must |
| AC-10-2 | `student` role returns `403` | Must |
| AC-10-3 | When no attempts exist, `totalAttempts = 0` and `avgBandScore = 0` | Must |

---

### Epic 5: AI Test Generation

---

#### US-11 — Generate Test from AI

> **As a teacher**, I want to generate a reading test automatically using Gemini AI, so that I can create high-quality content quickly.

**Acceptance Criteria:**

| ID | Criterion | Priority |
|---|---|---|
| AC-11-1 | `POST /api/reading/generate-ai` (teacher/admin) returns a fully-formed test object ready to be reviewed and saved | Must |
| AC-11-2 | If the Gemini API key is not configured, the endpoint returns a descriptive `500` error | Must |
| AC-11-3 | Generated questions follow the same schema as manually-created questions | Must |
| AC-11-4 | The AI key is resolved at runtime from auth-service; falls back to `GEMINI_API_KEY` env var | Must |

---

## 3. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | `GET /` list endpoint with 1 000 tests must respond in < 200 ms (indexed queries) |
| **Security** | JWT verified on all write/submit/history endpoints; roles enforced at middleware layer |
| **Data Integrity** | `createdBy` populated from JWT — client payload is ignored |
| **Availability** | Service exposes `GET /health` returning `{ status: "ok", service: "reading-service" }` |
| **Observability** | All errors logged with structured JSON (`level`, `message`, `service`, `requestId`, `timestamp`) |
| **Scalability** | Stateless — any number of replicas can run behind a load balancer |

---

## 4. Out of Scope (v1.0)

- Real-time collaborative test editing
- Audio-based reading (handled by `listening-service`)
- Plagiarism detection on student answers
- Stripe/payment integration (handled by `billing-service`)
