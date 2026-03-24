# Sprint 4: speaking-service

Sprint goal: Deliver Speaking task retrieval, audio submission linkage, teacher grading workflow, and student result review integrated with auth-service and cloud-media-service.

---

## User Stories in Scope

| Story ID | User Story | Story Points |
| --- | --- | --- |
| E4-US01 | As a Student, I want to view Speaking tasks so that I can attempt speaking practice tests. | 3 |
| E4-US02 | As a Student, I want to upload and submit my Speaking audio response so that a Teacher can assess my performance. | 8 |
| E4-US03 | As a Teacher, I want to see pending Speaking submissions so that I can manage my grading queue. | 5 |
| E4-US04 | As a Teacher, I want to assign IELTS descriptor-based Speaking scores and comments so that learners receive structured feedback. | 8 |
| E4-US05 | As a Student, I want to review my Speaking results and feedback so that I can improve fluency and accuracy. | 3 |

---

## Technical Breakdown

### E4-US01: View Speaking tasks

- [ ] Define `SpeakingTask` schema with `title`, `part`, `prompt`, `cueCard`, `followUpQuestions`, `bandLevel`, `isVipOnly`, `status`, `createdAt`, and `updatedAt`.
- [ ] Implement `GET /api/speaking/tasks` with pagination and access filtering.
- [ ] Implement `GET /api/speaking/tasks/:id` for task detail.
- [ ] Integrate Speaking task listing and detail pages in the frontend base.

### E4-US02: Submit audio response

- [ ] Define `SpeakingSubmission` schema with `taskId`, `studentId`, `audioAssetId`, `duration`, `status`, `submittedAt`, `gradedAt`, and grading summary fields.
- [ ] Implement `POST /api/speaking/submissions` to create a submission linked to a media asset.
- [ ] Validate that `audioAssetId` belongs to the authenticated student and is a valid audio asset from Sprint 2.
- [ ] Ensure submission creation fails safely if the audio asset contract is invalid.
- [ ] Integrate Speaking submission UI with audio upload component and submission confirmation flow.

### E4-US03: Teacher pending queue

- [ ] Implement `GET /api/speaking/submissions/pending` for Teacher queue management.
- [ ] Add filtering for overdue and newest-first review.
- [ ] Build frontend teacher queue and submission review page with embedded audio player.

### E4-US04: Grade Speaking with IELTS descriptors

- [ ] Define grading fields for fluency and coherence, lexical resource, grammatical range and accuracy, pronunciation, overall band, and comments.
- [ ] Implement `POST /api/speaking/submissions/:id/grade`.
- [ ] Implement `GET /api/speaking/submissions/:id` with role-aware result projection.
- [ ] Update status transitions from `pending` to `graded` after successful grading.
- [ ] Publish grading-complete event payload for notification-service integration.
- [ ] Build teacher grading UI with rubric entry and audio playback controls.

### E4-US05: Student result review

- [ ] Implement `GET /api/speaking/my-submissions` for student history.
- [ ] Build student history and result detail screens.
- [ ] Display rubric breakdown, comments, overall band, and recording reference when allowed.

---

## Shared Technical Tasks

### Database and Backend

- [ ] Finalize indexes for student history, teacher pending queue, and status retrieval.
- [ ] Add auth and role middleware for Student, Teacher, and Admin access paths.
- [ ] Normalize audio metadata expectations between media-service and speaking-service.

### REST API Surface

- [ ] Finalize contracts for task list, task detail, submission creation, pending queue, grading, student history, and result retrieval.
- [ ] Align embedded audio playback requirements with frontend player components.

### FE Integration into Sprint 0 Base

- [ ] Create Speaking API client methods and DTOs.
- [ ] Reuse shared upload and grading UI patterns established in Sprint 0 and Sprint 2.
- [ ] Add teacher and student route protection for Speaking views.

### Integration and Testing

- [ ] Test audio-linked submission creation.
- [ ] Test teacher grading flow and role restrictions.
- [ ] Test student history and result display.
- [ ] Record notification event contract for Sprint 9.

---

## Definition of Done for Sprint 4

- Students can view Speaking tasks and submit audio responses.
- Teachers can review and grade Speaking submissions.
- Students can view graded Speaking results.
- Audio asset linkage works reliably with Sprint 2 media-service outputs.
