# writing-service — Product Requirements Document

## 1. Service Overview

| Property | Value |
|---|---|
| Service | `writing-service` |
| Port | 3003 |
| Database | `ielts_writing_db` |
| Sprint | Sprint 3 |

Manages IELTS Writing prompts (Task 1 and Task 2) and student submission lifecycle, from submission through teacher grading and optional AI feedback.

---

## 2. Epics & User Stories

### Epic 1 — Writing Prompt Management

**US-1.1** As a student, I want to browse writing prompts filtered by task type.
- AC1: `GET /items?type=Task 1` returns only Task 1 prompts
- AC2: `GET /items?isSample=true` filters sample prompts
- AC3: Pagination: `page` and `limit` query params supported; `limit` capped at 50

**US-1.2** As a teacher, I want to create, edit, and delete writing prompts.
- AC1: `POST /` creates a new prompt (Teacher/Admin only)
- AC2: `PUT /:id` updates existing prompt
- AC3: `DELETE /:id` removes a prompt
- AC4: Response wraps created object in `{ success, message, data }`

### Epic 2 — Sample Essays

**US-2.1** As a teacher, I want to attach band-specific sample essays to a prompt.
- AC1: `POST /:id/samples` appends a sample with `{ bandScore, contentHtml, author }`
- AC2: `PUT /:id/samples/:sampleId` updates a specific sample
- AC3: `DELETE /:id/samples/:sampleId` removes a sample

### Epic 3 — Student Submission

**US-3.1** As a student, I want to submit a written response.
- AC1: `POST /submissions` with `{ writingId, taskType, content }` creates a Pending submission
- AC2: `taskType` must match the prompt's `type` — mismatch returns 400
- AC3: Non-existent `writingId` returns 404
- AC4: `wordCount` is auto-calculated from `content` (strips HTML tags)

**US-3.2** As a student, I want to see my submission history.
- AC1: `GET /submissions/my-submissions` returns own submissions sorted newest first
- AC2: Populates `writingId.title` and `writingId.type`

### Epic 4 — Teacher Grading

**US-4.1** As a teacher, I want to grade pending submissions.
- AC1: `GET /submissions/pending` returns ungraded submissions
- AC2: `PUT /submissions/:id/grade` with criteria `{ TR, CC, LR, GRA }` stores grading and sets status to `Graded`
- AC3: `overallBand` is computed as average of 4 criteria, rounded to nearest 0.5

**US-4.2** As a teacher, I want to add AI feedback to a graded submission.
- AC1: `PATCH /submissions/:id/ai-feedback` updates the `aiFeedback` field

---

## 3. Band Score Grading Criteria

| Criterion | Description |
|---|---|
| TR | Task Response (Task Achievement) |
| CC | Coherence & Cohesion |
| LR | Lexical Resource |
| GRA | Grammatical Range & Accuracy |

All criteria are 0–9 scale. Overall = average(TR, CC, LR, GRA) rounded to 0.5.

---

## 4. Non-Functional Requirements

- `timeLimit` auto-set: Task 1 → 20 min, Task 2 → 40 min
- `wordCount` calculated server-side (client value not trusted)
- Unauthenticated access to `GET /items` and `GET /:id` allowed (no token required)
