# Product Requirements Document (PRD) — Lesson Service

## 1. Overview
Lesson Service manages lesson content metadata for IELTS learning modules. It supports lesson creation and deletion for teachers/admins, public lesson browsing for authenticated students, and teacher-side listing with draft visibility.

## 2. Goals
- Allow teacher/admin to create and manage lesson entries.
- Allow students to browse only published lessons.
- Provide paginated and searchable lesson listing endpoints.
- Enforce role-based access control using JWT.

## 3. Actors
- Student: view published lessons and lesson details.
- Teacher/Admin: create, list (including drafts), and delete lessons.

## 4. Functional Requirements
### FR-01 Health
- GET /health returns service health payload.

### FR-02 Lesson listing for students
- GET / returns published lessons only.
- Supports page and search query parameters.

### FR-03 Lesson listing for teacher/admin
- GET /teacher returns all lessons (draft + published).
- Supports page and search query parameters.

### FR-04 Lesson details
- GET /:id returns one lesson by ID.
- Returns 400 for invalid ID format.
- Returns 404 when lesson does not exist.

### FR-05 Lesson creation
- POST / requires teacher/admin role.
- Requires title, description, videoUrl.
- Accepts optional videoType, thumbnailUrl, duration, status.
- teacherId taken from JWT user context.

### FR-06 Lesson deletion
- DELETE /:id requires teacher/admin role.
- Returns deleted lesson payload on success.

## 5. Security Requirements
- JWT required on all lesson routes.
- Student cannot access teacher/admin-only create/delete/teacher-list routes.
- Invalid or expired token returns 401.

## 6. Non-Functional Requirements
- Pagination default size is 6.
- Search supports case-insensitive match on title/description.
- DB indexes and schema validation should protect data consistency.

## 7. Acceptance Criteria
- Automated suite (schema, unit, api, e2e, regression) passes.
- Student endpoint excludes drafts.
- Teacher endpoint includes drafts.
- Role checks and validation behaviors return expected status codes.
