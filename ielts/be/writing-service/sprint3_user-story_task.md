# Sprint 3: writing-service

Sprint goal: Deliver Writing task retrieval, text submission, attachment linkage, teacher grading workflow, and student-facing result review integrated with auth-service and cloud-media-service.

---

## User Stories in Scope

| Story ID | User Story | Story Points |
| --- | --- | --- |
| E3-US01 | As a Student, I want to view Writing tasks so that I can choose and complete a writing exercise. | 3 |
| E3-US02 | As a Student, I want to submit a Writing response with optional image attachments so that I can complete tasks requiring text and supporting visuals. | 8 |
| E3-US03 | As a Teacher, I want to see pending Writing submissions so that I can grade them in order. | 5 |
| E3-US04 | As a Teacher, I want to evaluate Writing submissions using IELTS band descriptors so that students receive standardized scores and feedback. | 8 |
| E3-US05 | As a Student, I want to view my Writing results and feedback so that I can improve future submissions. | 3 |
| E3-US06 | As an Admin, I want overdue Writing submissions to be visible operationally so that grading SLA breaches can be monitored. | 3 |

---

## Technical Breakdown

### E3-US01: View Writing tasks

- [ ] Define `WritingTask` schema with `title`, `taskType`, `prompt`, `instructions`, `bandLevel`, `isVipOnly`, `status`, `createdBy`, `createdAt`, and `updatedAt`.
- [ ] Seed or migrate initial Writing tasks for development and QA.
- [ ] Implement `GET /api/writing/tasks` with filters for task type, VIP access, and pagination.
- [ ] Implement `GET /api/writing/tasks/:id` for task detail retrieval.
- [ ] Integrate Writing list and detail pages into the Sprint 0 frontend base.

### E3-US02: Submit Writing response with attachments

- [ ] Define `WritingSubmission` schema with `taskId`, `studentId`, `answerText`, `attachmentIds`, `status`, `submittedAt`, `gradedAt`, and grading summary fields.
- [ ] Implement `POST /api/writing/submissions` to create a new Writing submission.
- [ ] Validate attachment IDs against cloud-media-service ownership and asset type.
- [ ] Prevent invalid or incomplete submissions from being persisted as successful.
- [ ] Integrate the submission form with text editor, attachment picker, and submit flow.
- [ ] Add client-side draft persistence if the team wants minimal draft protection.

### E3-US03: Teacher sees pending submissions

- [ ] Implement `GET /api/writing/submissions/pending` for Teacher queue views.
- [ ] Add filters for newest, oldest, overdue, and task type.
- [ ] Restrict queue visibility to Teacher and Admin roles as policy allows.
- [ ] Build teacher queue page and submission detail view in the frontend base.

### E3-US04: Teacher grades with IELTS descriptors

- [ ] Define grading fields for task response, coherence and cohesion, lexical resource, grammatical range and accuracy, overall band, and comments.
- [ ] Implement `POST /api/writing/submissions/:id/grade` to save a new grade.
- [ ] Implement `GET /api/writing/submissions/:id` for teacher and student result retrieval with role-aware views.
- [ ] Update submission status from `pending` to `graded` on successful grading.
- [ ] Publish a grading-complete event contract for later notification-service integration.
- [ ] Build teacher grading form UI using Sprint 0 shared form and layout primitives.

### E3-US05: Student views Writing feedback

- [ ] Implement `GET /api/writing/my-submissions` for student history.
- [ ] Build student history page and result detail page.
- [ ] Display rubric scores, overall band, comments, and attachment references.

### E3-US06: Overdue visibility

- [ ] Define SLA logic for overdue submissions based on `submittedAt` and grading status.
- [ ] Implement overdue filtering on queue endpoints or a dedicated `GET /api/writing/submissions/overdue` route.
- [ ] Add overdue highlighting in teacher or admin queue screens.

---

## Shared Technical Tasks

### Database and Backend

- [ ] Finalize indexes for task visibility, student history, teacher queue, and overdue retrieval.
- [ ] Integrate auth claims for Student, Teacher, and Admin route protection.
- [ ] Add consistent validation and error mapping for media linkage and grading payloads.

### REST API Surface

- [ ] Finalize contracts for task listing, task detail, submission creation, pending queue, grading, student history, and result detail routes.
- [ ] Align attachment reference contracts with Sprint 2 media-service outputs.

### FE Integration into Sprint 0 Base

- [ ] Create Writing API client methods and DTOs in the frontend base.
- [ ] Reuse shared upload, form, table, and detail-view components from Sprint 0.
- [ ] Add student and teacher navigation entries with role-aware protection.

### Integration and Testing

- [ ] Test task retrieval for free and VIP visibility rules.
- [ ] Test Writing submission with and without attachments.
- [ ] Test grading workflow and unauthorized access behavior.
- [ ] Test student result retrieval after grading.
- [ ] Record notification event payload for Sprint 9 integration.

---

## Definition of Done for Sprint 3

- Students can view Writing tasks and submit responses.
- Teachers can see pending Writing submissions and grade them.
- Students can review Writing feedback and history.
- Media attachments are safely linked through the media-service contract.
