# Sprint 5: reading-service

Sprint goal: Deliver Reading test retrieval, answer submission, auto-grading, result calculation, and student-facing review integrated into the shared frontend base.

---

## User Stories in Scope

| Story ID | User Story | Story Points |
| --- | --- | --- |
| E2-US01 | As a Student, I want to browse available Reading tests so that I can choose an exercise appropriate to my level. | 3 |
| E2-US02 | As a Student, I want to take a Reading test and submit my answers so that I can receive an immediate score. | 8 |
| E2-US03 | As a Student, I want to review my Reading results and answer breakdown so that I can understand my mistakes. | 5 |
| E2-US04 | As a Student, I want to access my Reading attempt history so that I can track progress over time. | 3 |

---

## Technical Breakdown

### E2-US01: Browse Reading tests

- [ ] Define `ReadingTest` schema with `title`, `passages`, `questions`, `bandLevel`, `isVipOnly`, `status`, `createdAt`, and `updatedAt`.
- [ ] Implement `GET /api/reading/tests` with filters for band level, VIP visibility, and pagination.
- [ ] Implement `GET /api/reading/tests/:id` for full test retrieval.
- [ ] Build Reading list and exam-start pages in the frontend base.

### E2-US02: Submit answers and auto-grade

- [ ] Define `ReadingAttempt` schema with `testId`, `studentId`, `answers`, `score`, `correctCount`, `submittedAt`, and normalized result details.
- [ ] Implement scoring engine for supported Reading question types in current scope.
- [ ] Implement `POST /api/reading/submit` to validate answers, compute score, and persist attempt.
- [ ] Ensure failed submissions return explicit errors and do not silently discard payloads.
- [ ] Build frontend submit flow, completion state, and immediate result transition.

### E2-US03: Result review

- [ ] Implement `GET /api/reading/results/:attemptId` for result detail.
- [ ] Return correct answers, student answers, score summary, and breakdown needed by the UI.
- [ ] Build result page in the frontend base with answer review sections.

### E2-US04: Attempt history

- [ ] Implement `GET /api/reading/my-attempts` for student history.
- [ ] Add sorting by latest attempt, score, or test type if needed.
- [ ] Build Reading history screen and result re-entry flow.

---

## Shared Technical Tasks

### Database and Backend

- [ ] Finalize indexes for test retrieval, student history, and attempt detail lookup.
- [ ] Add auth integration for Student and VIP access control.
- [ ] Add seed alignment and data migration checks for existing Reading content.

### REST API Surface

- [ ] Finalize contracts for list, detail, submit, result detail, and student history routes.
- [ ] Document scoring payload expectations for frontend and QA.

### FE Integration into Sprint 0 Base

- [ ] Create Reading API client methods and DTOs.
- [ ] Build list, exam, result, and history flows using the shared frontend shell.
- [ ] Reuse Sprint 0 loading, empty, and error states for long-form test flows.

### Integration and Testing

- [ ] Test Reading test retrieval and access filtering.
- [ ] Test auto-grading happy path and invalid payload path.
- [ ] Test result review and attempt history retrieval.
- [ ] Validate p95 response targets for normal-sized submissions where feasible.

---

## Definition of Done for Sprint 5

- Students can browse and take Reading tests.
- Answer submission returns immediate, persisted results.
- Students can review breakdowns and attempt history.
