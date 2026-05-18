# Speaking Service — Product Requirements Document

## Overview
The Speaking Service manages IELTS Speaking test content, student submissions, and teacher grading. It supports the 3-part IELTS Speaking format (Part 1: questions, Part 2: cue card, Part 3: discussion), audio submission via Cloudinary, and a human-grading workflow using the 4-criterion IELTS marking scheme.

**Base URL (via API Gateway):** `/api/speaking`  
**Port:** 3008

---

## Epic 1 — Test Bank Management

### US1.1 — Teacher Creates Speaking Test
- **Actor:** Teacher / Admin
- **Trigger:** POST `/tests`
- **Acceptance Criteria:**
  - `title` (string, non-empty) is required
  - `part1` (array of strings, min 1 item) is required
  - `part2` (string, non-empty cue card) is required
  - `part3` (array of strings, min 1 item) is required
  - Returns `{ success: true, data: <test> }` with HTTP 201
  - Student tokens receive HTTP 403

### US1.2 — List Speaking Tests (Student)
- **Actor:** Student (unauthenticated allowed)
- **Trigger:** GET `/`
- **Acceptance Criteria:**
  - Returns `{ success: true, data: [{ _id, title, createdAt }] }` (no question content)
  - HTTP 200

### US1.3 — List Tests (Teacher Prompt Bank)
- **Actor:** Teacher / Admin
- **Trigger:** GET `/tests`
- **Acceptance Criteria:**
  - Returns full test content with `submissionCount` per test
  - Requires bearer token with `teacher` or `admin` role

### US1.4 — Get Test Detail
- **Actor:** Any authenticated user
- **Trigger:** GET `/tests/:id`
- **Acceptance Criteria:**
  - Returns `{ success: true, data: <test> }` with full part1/part2/part3
  - HTTP 404 for unknown id

### US1.5 — Update / Delete Test
- **Actor:** Teacher / Admin
- **Trigger:** PUT `/tests/:id`, DELETE `/tests/:id`
- **Acceptance Criteria:**
  - Requires `teacher` or `admin` role
  - HTTP 403 for students

---

## Epic 2 — Student Submission

### US2.1 — Start or Update Attempt
- **Actor:** Student, Teacher, Admin
- **Trigger:** POST `/tests/:testId/attempt`
- **Acceptance Criteria:**
  - Student provides `answers` (array of strings) and/or `audioUrl`
  - Creates or updates an existing `Pending` submission (upsert pattern)
  - Returns `{ success: true, data: <submission> }` with HTTP 201
  - Empty answers → HTTP 400

### US2.2 — Submit Audio (Legacy)
- **Actor:** Student
- **Trigger:** PUT `/:id/submit`
- **Acceptance Criteria:**
  - Requires `audioUrl` in request body
  - Only submission owner can submit
  - Updates submission `audioUrl`, sets `status` to Submitted

### US2.3 — View My Submissions
- **Actor:** Any authenticated user
- **Trigger:** GET `/submissions/my-submissions`
- **Acceptance Criteria:**
  - Returns only submissions belonging to `req.user.id`
  - HTTP 401 without token

---

## Epic 3 — Teacher Grading

### US3.1 — Grade Submission
- **Actor:** Teacher / Admin
- **Trigger:** PUT `/:id/grade`
- **Acceptance Criteria:**
  - Body: `{ criteria: { FC, LR, GRA, PR } }` each 0–9
  - Invalid score (>9 or <0) → HTTP 400
  - Returns `{ success: true, data: <submission with overallBand> }`
  - `overallBand` = average of 4 criteria rounded to nearest 0.5

### US3.2 — View Pending Submissions
- **Actor:** Teacher / Admin
- **Trigger:** GET `/pending`
- **Acceptance Criteria:**
  - Returns all `Pending` submissions across all students

### US3.3 — View Graded Submissions
- **Actor:** Teacher / Admin
- **Trigger:** GET `/graded`

### US3.4 — Submission Stats
- **Actor:** Teacher / Admin
- **Trigger:** GET `/stats`

---

## Epic 4 — Legacy Assignment Flow (Deprecated)

### US4.1 — Assign Questions
- **Trigger:** POST `/assign`
- **Note:** Soft-deprecated; use `/tests/:testId/attempt` instead

### US4.2 — Get My Pending Test
- **Trigger:** GET `/my-pending`
- **Note:** Returns first Pending submission for the authenticated student

---

## Non-functional Requirements
- All responses follow `{ success: boolean, data?, message? }` shape
- JWT auth via `Authorization: Bearer <token>` header
- Role values are lowercase: `student`, `teacher`, `admin`
- Audio storage via Cloudinary (URL stored in `audioUrl` field)
