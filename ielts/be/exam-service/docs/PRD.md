# Product Requirements Document (PRD) — Exam Service

## 1. Overview
Exam Service orchestrates full mock IELTS exam lifecycle across reading, listening, writing, and speaking skills. It supports both student attempt workflows and teacher/admin exam management/monitoring workflows.

## 2. Goals
- Provide secure exam and attempt APIs with role-based access.
- Track global attempt windows and per-skill execution state.
- Support teacher exam creation, publication, and monitoring operations.
- Enable orchestration endpoints for PDF-based exam generation progress.

## 3. Actors
- Student: starts exams, works through skills, saves snapshots, submits skills/exam.
- Teacher/Admin: creates/publishes/deletes exams, monitors and grades attempts.
- Internal services: exam lifecycle/timeout services and RabbitMQ integrations.

## 4. Functional Requirements
### FR-01 Student exam access
- GET /exams lists student-visible exams.
- POST /exams/:examId/start starts new exam attempt.
- GET /attempts/:attemptId returns attempt details.

### FR-02 Skill progression
- POST /attempts/:attemptId/skills/:skillType/start starts a skill attempt.
- PUT /attempts/:attemptId/skills/:skillType/snapshot saves interim answers.
- POST /attempts/:attemptId/skills/:skillType/submit submits a skill.
- POST /attempts/:attemptId/submit submits whole exam attempt.

### FR-03 Teacher/Admin exam management
- GET /teacher/exams lists managed exams.
- POST /teacher/exams creates exam draft.
- POST /teacher/exams/:examId/publish publishes draft exam.
- DELETE /teacher/exams/:examId deletes exam.
- POST /teacher/exams/orchestrate-pdf accepts exam/answer PDFs for orchestration.

### FR-04 Monitoring and grading
- GET /teacher/monitoring/attempts lists monitoring board data.
- GET /teacher/students/:userId/attempts fetches student attempt history.
- GET /teacher/attempts/:attemptId fetches one attempt for teacher view.
- POST /teacher/attempts/:attemptId/grade grades an attempt.

### FR-05 Orchestration progress
- GET /teacher/exams/orchestrate-progress/:jobId streams/returns orchestration progress.
- Supports token query fallback for SSE clients.

## 5. Security and Access Control
- JWT required for all exam and teacher routes.
- Roles allowed on student routes: student, teacher, admin.
- Roles allowed on teacher routes: teacher, admin.
- Invalid/missing/expired tokens return 401.
- Role mismatch returns 403.

## 6. Non-Functional Requirements
- Reliability: attempt state transitions must be deterministic.
- Auditability: attempt and grading timestamps retained in DB.
- Performance: indexes on exam, user, status, and deadlines.
- Compatibility: fallback token query for EventSource/SSE scenarios.

## 7. Acceptance Criteria
- Automated suite (schema, unit, api, e2e, regression) passes.
- Role protections are enforced exactly per route category.
- Model constraints prevent invalid enum values and duplicate skill attempts.
- Health endpoint available at /health.
