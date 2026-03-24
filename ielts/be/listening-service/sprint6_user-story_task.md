# Sprint 6: listening-service

Sprint goal: Deliver Listening test retrieval, normalized answer checking, auto-grading, result persistence, and student-facing review integrated into the shared frontend base.

---

## User Stories in Scope

| Story ID | User Story | Story Points |
| --- | --- | --- |
| E2-US05 | As a Student, I want to browse available Listening tests so that I can select a suitable listening practice session. | 3 |
| E2-US06 | As a Student, I want to submit Listening answers and receive an immediate score so that I can review my performance right away. | 8 |
| E2-US07 | As a Student, I want the system to normalize accepted answer variants so that correct answers are graded fairly. | 5 |
| E2-US08 | As a Student, I want to review Listening attempt history so that I can measure improvement. | 3 |

---

## Technical Breakdown

### E2-US05: Browse Listening tests

- [ ] Define `ListeningTest` schema with `title`, `sections`, `audioRefs`, `questions`, `bandLevel`, `isVipOnly`, `status`, `createdAt`, and `updatedAt`.
- [ ] Implement `GET /api/listening/tests` with visibility and pagination filters.
- [ ] Implement `GET /api/listening/tests/:id` for full test detail.
- [ ] Build Listening list and exam-start pages in the frontend base.

### E2-US06: Submit answers and auto-grade

- [ ] Define `ListeningAttempt` schema with `testId`, `studentId`, `answers`, `score`, `correctCount`, `submittedAt`, and result breakdown.
- [ ] Implement `POST /api/listening/submit` to validate, normalize, score, and persist attempts.
- [ ] Ensure the API returns immediate score and answer review payloads.
- [ ] Build frontend submit flow and result transition.

### E2-US07: Normalize accepted answers

- [ ] Design normalization rules for case-insensitive matching, spacing normalization, punctuation stripping, and accepted equivalents where needed.
- [ ] Encapsulate normalization logic in a dedicated scoring utility for maintainability.
- [ ] Add regression tests covering representative normalized answer cases.

### E2-US08: Listening history

- [ ] Implement `GET /api/listening/my-attempts` for student attempt history.
- [ ] Implement `GET /api/listening/results/:attemptId` if result detail is separated from submit response.
- [ ] Build history and result review pages in the frontend base.

---

## Shared Technical Tasks

### Database and Backend

- [ ] Finalize indexes for test retrieval and student attempt history.
- [ ] Validate audio reference strategy between existing public assets and service responses.
- [ ] Add auth integration for Student and VIP visibility rules.

### REST API Surface

- [ ] Finalize contracts for list, detail, submit, result detail, and attempt history routes.
- [ ] Document normalization behavior clearly for QA and frontend review.

### FE Integration into Sprint 0 Base

- [ ] Create Listening API client methods and DTOs.
- [ ] Build list, exam, result, and history screens using shared frontend patterns.
- [ ] Ensure audio playback UI is reliable across desktop and mobile layouts.

### Integration and Testing

- [ ] Test Listening test retrieval and access control.
- [ ] Test normalized grading behavior with variant inputs.
- [ ] Test result and history retrieval.
- [ ] Validate normal-load response targets where feasible.

---

## Definition of Done for Sprint 6

- Students can browse and take Listening tests.
- Normalized auto-grading works for supported answer rules.
- Students can review results and attempt history.
