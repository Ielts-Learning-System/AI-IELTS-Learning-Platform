# Listening Service — Product Requirements Document

## Overview
The Listening Service manages IELTS listening practice tests, part-by-part submission, automated grading, and attempt history tracking.

**Port:** 3004 | **DB:** `ielts_listening_db`

---

## Epic 1: Test Management (Admin/Teacher)

### US-1.1 Create Listening Test
**As a** teacher, **I want to** create a multi-part listening test with audio URLs and questions, **so that** students can practise their listening skills.

**Acceptance Criteria:**
- POST `/` requires Bearer token with role `teacher` or `admin`
- Request body must include `title` and `parts[]`
- Each part must have `partNumber`, `title`, `audioUrl`, and `questions[]`
- Questions must have `type` ∈ `[multiple_choice, fill_blank, map_labeling, matching]`
- Returns 201 with the created test document
- Returns 403 for student tokens; 401 for no token

### US-1.2 Update / Delete Test
**As an** admin, **I want to** update or delete tests, **so that** outdated tests can be corrected or removed.

**Acceptance Criteria:**
- PUT `/:id` and DELETE `/:id` require `admin` or `teacher` role
- PUT runs validators and returns the updated document
- DELETE returns `{ success: true, message: "..." }`
- Both return 404 if the test does not exist

---

## Epic 2: Test Discovery (Students/Public)

### US-2.1 List All Tests
**As a** student, **I want to** browse all available listening tests, **so that** I can choose one to practise.

**Acceptance Criteria:**
- GET `/` is publicly accessible (no token required)
- Returns paginated results: `{ success, data[], pagination: { total, page, limit, pages } }`
- Correct answers are NOT exposed in the list view
- Default `limit=10`, `page=1`

### US-2.2 View Test Detail
**As a** student, **I want to** see a test's parts and questions without answers, **so that** I can start taking the test.

**Acceptance Criteria:**
- GET `/:id` is publicly accessible
- Returns the test document with `correctAnswer` fields removed
- Returns 404 if test not found

---

## Epic 3: Student Submission & Grading

### US-3.1 Submit Full Test
**As a** student, **I want to** submit answers for an entire listening test, **so that** I receive a band score.

**Acceptance Criteria:**
- POST `/:id/submit` requires `student` token
- Request body: `{ studentAnswers: string[], timeSpent: number }`
- `studentAnswers` must be an array (400 if not)
- Scoring uses exact match + alternate-answer `/` separator
- Returns 201 with `{ success, data: attempt }` including `rawScore` and `bandScore`

### US-3.2 Submit Single Part
**As a** student, **I want to** submit answers part by part, **so that** I can practise individual sections.

**Acceptance Criteria:**
- POST `/:id/submit-part` requires `student` token
- Request body: `{ partNumber: 1-4, studentAnswers: string[], timeSpent?: number }`
- Returns 400 if `studentAnswers` is not an array or `partNumber` is invalid
- Returns 404 if part does not exist in the test
- Returns 201 with `{ success, data: attempt }` including part-level score

### US-3.3 View Attempt History
**As a** student, **I want to** see all my past attempts, **so that** I can track my progress.

**Acceptance Criteria:**
- GET `/my-attempts` requires authenticated token with any of `student`, `teacher`, `admin` role
- Returns only attempts owned by the requesting user (`studentId === req.user.id`)
- Returns 401 if no token

---

## Epic 4: Analytics (Admin/Teacher)

### US-4.1 View All Attempts
**As a** teacher, **I want to** see all student attempts, **so that** I can monitor class performance.

**Acceptance Criteria:**
- GET `/attempts` requires `admin` or `teacher` token
- Returns paginated list of all attempts across all students

### US-4.2 Attempt Statistics
**As an** admin, **I want to** see aggregate statistics, **so that** I can understand overall performance trends.

**Acceptance Criteria:**
- GET `/stats` requires `admin` or `teacher` token
- Returns counts, average band score, and distribution data
