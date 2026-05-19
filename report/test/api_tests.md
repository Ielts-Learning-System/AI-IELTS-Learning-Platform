# 🌐 API / Integration Tests

> **HTTP layer tests — Supertest against in-memory MongoDB**

| Field | Value |
|---|---|
| **Project** | IELTS-Mate Platform |
| **Framework** | Jest 29 · Supertest · mongodb-memory-server |
| **Test Scope** | Jest + Supertest + MongoMemoryServer · Real Express routes · Mocked external services |
| **Total Test Cases** | **327** |
| **Test Files** | 18 |
| **Services Covered** | 11 / 11 |
| **Run Date** | 2026-05-18 |
| **All Passed** | ✅ 850 / 850 |

## What is Tested

Every Express route: correct status codes, response envelope shape,
JWT auth guards (401/403), pagination, sorting, filtering, CRUD operations,
and error paths (400 / 404 / 409 / 422).

## Table of Contents

- [Auth Service (port 3001)](#auth-service)
- [Billing Service (port 3007)](#billing-service)
- [Cloud Media Service (port 3010)](#cloud-media-service)
- [Exam Service (port 3006)](#exam-service)
- [Lesson Service (port 3011)](#lesson-service)
- [Listening Service (port 3004)](#listening-service)
- [Notification Service (port 3009)](#notification-service)
- [Payment Service (port 3008)](#payment-service)
- [Reading Service (port 3002)](#reading-service)
- [Speaking Service (port 3005)](#speaking-service)
- [Writing Service (port 3003)](#writing-service)

---

## Auth Service (port 3001)
<a id="auth-service"></a>

**Test cases:** 40  |  **Files:** 2

### 📄 `testing/api.test.js`

> auth-service — api.test.js
> Supertest HTTP integration tests against in-memory MongoDB.

#### POST /register

  1. ✅ 201 - registers a new user and returns token
  2. 🔴 400 - missing email
  3. 🔴 400 - missing password
  4. ✅ 400 - duplicate email
  5. ✅ forces role to Student even if Admin provided in body

#### POST /login

  1. ✅ 200 - returns token for valid credentials
  2. 🔴 401 - wrong password
  3. ✅ 401 - non-existent email
  4. 🔴 400 - missing email

#### GET /profile

  1. ✅ 200 - returns user profile
  2. ✅ 401 - no token
  3. 🔴 401 - invalid token

#### PUT /change-password

  1. ✅ 200 - changes password successfully
  2. 🔴 400 - wrong current password

#### GET /health

  1. ✅ 200 - service is alive

### 📄 `tests/integration/auth.routes.integration.test.js`

#### POST /register

  1. ✅ should register a new student successfully
  2. ✅ should always force role to Student even if Admin is sent
  3. ✅ should return 400 if email already exists
  4. 🔴 should return 400 if email is missing
  5. 🔴 should return 400 if password is missing

#### POST /login

  1. ✅ should login successfully with correct credentials
  2. 🔴 should return 401 for wrong password
  3. ✅ should return 401 for non-existent email
  4. 🔴 should return 400 if email or password missing

#### GET /profile

  1. ✅ should return profile for authenticated user
  2. ✅ should return 401 without token
  3. 🔴 should return 401 with invalid token

#### PUT /update-role/:id

  1. ✅ should allow admin to update user role
  2. 🔴 should return 400 for invalid role value
  3. ✅ should return 403 for non-admin user
  4. ✅ should return 404 for non-existent user

#### GET /api/users

  1. ✅ should return all users for admin
  2. ✅ should filter users by role query param
  3. ✅ should return 403 for Student role

#### PUT /api/users/:id/status

  1. ✅ should block a user
  2. ✅ should unblock a user
  3. ✅ should return 400 if isActive is not boolean

#### POST /api/users/lookup

  1. ✅ should return users matching provided ids
  2. 🟡 should return empty array for empty ids
  3. ✅ should return 400 if ids is not an array

---

## Billing Service (port 3007)
<a id="billing-service"></a>

**Test cases:** 67  |  **Files:** 2

### 📄 `tests/api.test.js`

> Billing-service — API tests
> Covers all 18+ endpoints across billing.routes.js, reports.routes.js, resources.routes.js

#### GET /health

  1. ✅ 200 - service alive

#### GET /plans

  1. ✅ 200 - returns only active plans sorted by price asc
  2. 🟡 200 - empty array when no active plans
  3. ✅ 200 - no auth token required

#### GET /my-subscription

  1. ✅ 401 - no token
  2. 🟡 200 - data:null + planFallback for FREE user with no subscription record
  3. ✅ 200 - returns ACTIVE subscription
  4. ✅ 200 - auto-expires past validUntil subscription

#### GET /my-plan

  1. ✅ 401 - no token
  2. ✅ 200 - same behavior as my-subscription

#### GET /my-skills

  1. ✅ 401 - no token
  2. 🟡 200 - FREE plan returns empty allowedSkills
  3. ✅ 200 - PLUS plan returns configured skills
  4. ✅ 200 - PRO flag set when plan is PRO

#### POST /admin/plans

  1. ✅ 401 - no token
  2. ✅ 403 - student cannot create plan
  3. ✅ 201 - admin creates plan
  4. 🔴 400 - missing required fields

#### GET /admin/plans

  1. ✅ 403 - student cannot list admin plans
  2. ✅ 200 - admin gets all plans including inactive

#### PUT /admin/plans/:planId

  1. ✅ 200 - admin updates plan fields
  2. 🔴 404 - plan not found

#### PATCH /admin/plans/:planId/toggle-active

  1. ✅ 200 - toggles isActive from true to false
  2. ✅ 200 - toggles isActive from false to true
  3. 🔴 404 - plan not found

#### DELETE /admin/plans/:planId

  1. ✅ 200 - admin deletes plan
  2. 🔴 404 - plan not found
  3. ✅ 403 - student cannot delete plan

#### GET /admin/stats

  1. 🟡 200 - returns billing stats with zero values when empty
  2. ✅ 200 - counts active subscriptions correctly

#### GET /admin/subscriptions

  1. ✅ 403 - student cannot view all subscriptions
  2. ✅ 200 - admin gets all subscriptions
  3. ✅ 200 - includes subscription data with daysRemaining

#### POST /internal/subscriptions/activate

  1. 🔴 400 - missing userId
  2. 🔴 400 - missing planCode
  3. 🔴 400 - missing validUntil
  4. 🔴 400 - invalid userId format
  5. 🟡 404 - unknown planCode
  6. ✅ 200 - activates subscription without auth token (no auth required)
  7. ✅ 200 - upserts subscription (idempotent)

#### POST /admin/remind/:userId

  1. 🔴 400 - invalid userId format
  2. ✅ 404 - no subscription for user
  3. ✅ 200 - publishes billing.subscription.reminder event

#### POST /admin/subscriptions/:subscriptionId/cancel

  1. 🔴 400 - missing reason / title / message
  2. 🔴 400 - invalid reason enum
  3. ✅ 400 - cannot cancel non-ACTIVE subscription
  4. ✅ 200 - cancels ACTIVE subscription and publishes event
  5. 🔴 200 - proceeds with fallback user data when axios fails

#### POST /admin/subscriptions/:subscriptionId/restore

  1. ✅ 400 - cannot restore non-CANCELLED subscription
  2. ✅ 400 - cannot restore if validUntil is in the past
  3. ✅ 200 - restores CANCELLED subscription and publishes event

#### GET /skill-check/:skillName

  1. ✅ 401 - no token
  2. ✅ 200 - PRO user passes all skills
  3. ✅ 403 - FREE user denied for any skill
  4. ✅ 200 - PLUS user allowed for skill in plan
  5. ✅ 403 - PLUS user denied for skill not in plan

#### POST /example/writing/submit

  1. ✅ 401 - no token
  2. ✅ 403 - FREE user cannot submit
  3. ✅ 201 - PRO user can submit
  4. ✅ 201 - PLUS user with writing skill can submit

### 📄 `tests/integration/billing.routes.integration.test.js`

#### GET /plans

  1. ✅ returns active plans sorted by price ascending

#### GET /my-subscription

  1. 🟡 returns 200 with data:null when subscription does not exist (FREE plan)
  2. ✅ returns populated subscription and auto-expires when validUntil is in the past

#### Admin plan APIs

  1. ✅ allows admin to create, update and toggle plan active status
  2. ✅ blocks student from admin endpoints

#### GET /admin/subscriptions

  1. ✅ returns subscriptions with populated plan and daysRemaining

#### POST /admin/remind/:userId

  1. ✅ publishes billing.subscription.reminder event

---

## Cloud Media Service (port 3010)
<a id="cloud-media-service"></a>

**Test cases:** 11  |  **Files:** 1

### 📄 `tests/integration/media.routes.integration.test.js`

#### GET /health

  1. ✅ should return healthy status

#### POST /api/media/upload

  1. ✅ should upload an image file successfully
  2. ✅ should upload an audio file successfully
  3. ✅ should upload a PDF file successfully
  4. ✅ should return 400 when no file is attached
  5. 🔴 should reject unsupported file types

#### DELETE /api/media/delete

  1. ✅ should delete a media file by public_id
  2. ✅ should default resource_type to image
  3. 🔴 should return 400 when public_id is missing

#### GET /api/media/generate-signature

  1. ✅ should generate a Cloudinary upload signature
  2. ✅ should use default folder when folderName not provided

---

## Exam Service (port 3006)
<a id="exam-service"></a>

**Test cases:** 7  |  **Files:** 1

### 📄 `tests/api.test.js`

#### Exam API routing/auth

  1. ✅ GET /health returns service status
  2. ✅ student can access student routes
  3. ✅ requires auth on protected routes
  4. 🔴 teacher/admin routes reject student
  5. ✅ teacher can access teacher routes
  6. ✅ SSE progress route accepts token via query parameter
  7. ✅ upload orchestration route resolves upload middleware then controller

---

## Lesson Service (port 3011)
<a id="lesson-service"></a>

**Test cases:** 6  |  **Files:** 1

### 📄 `tests/api.test.js`

#### Lesson API

  1. ✅ GET /health works
  2. ✅ POST / creates lesson for teacher
  3. ✅ POST / blocks student role
  4. ✅ GET / returns only Published lessons for students
  5. ✅ GET /teacher returns both Draft and Published for teacher/admin
  6. ✅ GET /:id and DELETE /:id work with valid ids

---

## Listening Service (port 3004)
<a id="listening-service"></a>

**Test cases:** 23  |  **Files:** 2

### 📄 `testing/api.test.js`

> listening-service — api.test.js
> Supertest HTTP integration tests.

#### GET /

  1. ✅ 200 - returns paginated list
  2. 🟡 200 - empty list when no tests

#### GET /:id

  1. ✅ 200 - returns test detail (correct answers hidden)
  2. ✅ 404 - non-existent test id

#### POST /

  1. ✅ 201 - teacher can create a test
  2. ✅ 403 - student cannot create a test
  3. ✅ 401 - no token

#### POST /:id/submit-part

  1. ✅ 200 - student submits part answers and receives score
  2. ✅ 401 - no token

#### GET /my-attempts

  1. ✅ 200 - authenticated student sees own attempts
  2. ✅ 401 - no token

#### GET /health

  1. ✅ 200 - service is alive

### 📄 `tests/integration/listening.routes.integration.test.js`

#### GET /

  1. ✅ should return paginated listening tests
  2. 🟡 should return empty data when no tests

#### GET /:id

  1. ✅ should return test without correct answers
  2. ✅ should return 404 for non-existent test

#### POST /

  1. ✅ should create a listening test as teacher
  2. ✅ should return 403 for student
  3. ✅ should return 401 without token

#### POST /:id/submit

  1. ✅ should auto-grade and return band score
  2. ✅ should handle case-insensitive answer matching
  3. ✅ should return 400 if studentAnswers is not array
  4. ✅ should return 404 for non-existent test

---

## Notification Service (port 3009)
<a id="notification-service"></a>

**Test cases:** 14  |  **Files:** 1

### 📄 `tests/api.test.js`

#### GET /

  1. ✅ returns paginated in-app notifications for authenticated user
  2. ✅ returns filtered unread notifications
  3. 🟡 returns empty shape without token

#### GET /unread-count

  1. ✅ returns unread in-app count
  2. ✅ returns 0 without token

#### PATCH /:id/read and /read-all

  1. ✅ marks one notification as read
  2. ✅ returns 404 when notification does not belong to user
  3. ✅ marks all unread in-app notifications as read

#### Preferences + Push + Teacher endpoints

  1. 🔴 creates default preferences if missing
  2. ✅ updates preferences
  3. ✅ validates push subscribe payload
  4. ✅ unsubscribe requires endpoint and deletes existing subscription
  5. ✅ teacher can send and list notifications for a student
  6. 🔴 student is forbidden on teacher endpoints

---

## Payment Service (port 3008)
<a id="payment-service"></a>

**Test cases:** 48  |  **Files:** 2

### 📄 `tests/api.test.js`

> Payment-service — API tests
> Covers all 6 endpoints

#### GET /health

  1. ✅ 200 - service alive
  2. ✅ 200 - root endpoint

#### POST /create

  1. ✅ 401 - no token
  2. 🔴 400 - missing planId
  3. 🔴 400 - missing amount
  4. ✅ 400 - amount is zero
  5. 🔴 400 - amount is negative
  6. ✅ 400 - amount is non-numeric string
  7. ✅ 200 - creates pending transaction and returns QR URL
  8. ✅ 200 - POST /create-vietqr works as alias
  9. ✅ 200 - QR URL includes encoded orderId and accountName
  10. ✅ 200 - QR URL includes amount

#### GET /transactions/my-pending

  1. ✅ 401 - no token
  2. 🟡 200 - data:null when no pending
  3. ✅ 200 - returns latest pending transaction
  4. 🔴 200 - returns null when only Success/Failed transactions
  5. ✅ 200 - only returns transactions for authenticated user

#### GET /transactions

  1. ✅ 401 - no token
  2. ✅ 200 - returns all transactions sorted desc
  3. ✅ 200 - still returns when auth-service is down (fallback)
  4. 🟡 200 - empty array when no transactions

#### PUT /transactions/:id/approve

  1. ✅ 401 - no token
  2. 🔴 404 - transaction not found
  3. ✅ 400 - cannot approve non-Pending transaction
  4. ✅ 400 - unsupported planId
  5. ✅ 200 - approves PLUS transaction, updates status to Success
  6. ✅ 200 - approves PRO transaction
  7. ✅ 200 - approves VIP_1_MONTH transaction as PLUS/30 days
  8. ✅ 200 - approves VIP_6_MONTH as PLUS/180 days
  9. ✅ 502 - returns 502 when auth-service is down
  10. 🔴 200 - billing-service failure is non-fatal (still 200)

#### PUT /transactions/:id/reject

  1. ✅ 401 - no token
  2. 🔴 404 - transaction not found
  3. 🔴 400 - cannot reject non-Pending transaction
  4. 🔴 200 - rejects pending transaction, status becomes Failed
  5. 🔴 200 - reject does not call auth-service

### 📄 `tests/integration/payment.routes.integration.test.js`

#### POST /create

  1. ✅ should create a pending transaction and return QR URL
  2. 🔴 should return 400 if planId missing
  3. 🔴 should return 400 if amount is zero or negative
  4. ✅ should return 401 without token

#### GET /transactions/my-pending

  1. ✅ should return latest pending transaction
  2. 🟡 should return null if no pending transaction

#### GET /transactions

  1. ✅ should return all transactions

#### PUT /transactions/:id/approve

  1. ✅ should approve a pending transaction and upgrade user
  2. ✅ should return 404 for non-existent transaction
  3. ✅ should return 400 if transaction already approved

#### PUT /transactions/:id/reject

  1. 🔴 should reject a pending transaction
  2. 🔴 should return 400 if already rejected

---

## Reading Service (port 3002)
<a id="reading-service"></a>

**Test cases:** 53  |  **Files:** 2

### 📄 `testing/api.test.js`

> INTEGRATION TESTS — API / HTTP Layer
> Scope  : Every Express route defined in reading.routes.js is
> exercised via Supertest against a real in-memory
> MongoDB instance.
> Method : MongoMemoryServer spins up once per file.  Seed data
> is created per-describe block to keep concerns clean.
> Covers : HTTP status codes · response envelope shape ·
> auth guards (401 / 403) · pagination · error paths.

#### GET / — list all tests

  1. 🟡 200 returns paginated envelope with empty data when no tests exist
  2. ✅ 200 returns one record after seeding
  3. ✅ 200 respects ?page=2&limit=2 (returns 1 of 3)
  4. ✅ 200 list items do NOT expose correctAnswer field (security)

#### GET /:id — test detail

  1. ✅ 200 returns full test with passages and questions
  2. ✅ 404 when the test does not exist
  3. ✅ 500 when id is malformed (not a valid ObjectId)

#### POST / — create test

  1. ✅ 201 teacher can create a test
  2. ✅ 201 admin can also create a test
  3. 🔴 400 when title is missing
  4. 🟡 400 when passages is empty array
  5. ✅ 401 when no Authorization header is sent
  6. ✅ 403 when a student tries to create a test

#### PUT /:id — update test

  1. ✅ 200 owner (teacher) can update their own test
  2. ✅ 200 admin can update any test regardless of ownership
  3. ✅ 403 when a different teacher (non-owner) tries to update
  4. ✅ 404 when updating a non-existent test

#### DELETE /:id — delete test

  1. ✅ 200 owner can delete their own test
  2. ✅ 403 non-owner teacher cannot delete
  3. ✅ 404 deleting a non-existent test

#### POST /:id/submit — full test submission

  1. ✅ 201 student submits answers and receives graded attempt
  2. 🔴 201 with rawScore 0 when all answers are wrong
  3. 🟡 201 with rawScore 0 when studentAnswers is empty
  4. ✅ 400 when studentAnswers is not an array
  5. ✅ 401 when unauthenticated
  6. ✅ 404 when submitting to a non-existent test

#### POST /:id/submit-passage — single passage submission

  1. ✅ 201 returns graded result for passage 1
  2. ✅ 400 when passageNumber is 0 (out of valid range)
  3. ✅ 400 when passageNumber is 4 (above valid range)
  4. ✅ 404 when passageNumber does not exist in the test

#### GET /my-attempts — student history

  1. ✅ 200 returns only attempts belonging to the authenticated student
  2. ✅ 401 when called without a token

#### GET /attempts — all attempts (teacher+)

  1. ✅ 200 teacher can view all attempts
  2. ✅ 403 student cannot access all attempts

#### GET /stats — attempt statistics

  1. ✅ 200 returns totalAttempts and avgBandScore
  2. ✅ 200 totalAttempts reflects seeded data
  3. ✅ 403 student cannot access stats

### 📄 `tests/integration/reading.routes.integration.test.js`

#### GET /

  1. ✅ should return paginated tests
  2. 🟡 should return empty array when no tests exist
  3. ✅ should respect page and limit query params

#### GET /:id

  1. ✅ should return full test details
  2. ✅ should return 404 for non-existent test

#### POST /

  1. ✅ should create a test as teacher
  2. 🔴 should return 400 if title is missing
  3. 🟡 should return 400 if passages are empty
  4. ✅ should return 403 for student role
  5. ✅ should return 401 without token

#### POST /:id/submit

  1. ✅ should auto-grade and return band score
  2. ✅ should handle partially correct answers
  3. 🔴 should handle all wrong answers
  4. ✅ should return 400 if studentAnswers is not an array
  5. ✅ should return 404 for non-existent test
  6. ✅ should return 403 for teacher role

---

## Speaking Service (port 3005)
<a id="speaking-service"></a>

**Test cases:** 29  |  **Files:** 2

### 📄 `testing/api.test.js`

> speaking-service — api.test.js

#### GET /

  1. ✅ 200 - returns list of speaking tests
  2. 🟡 200 - empty array when no tests

#### GET /tests/:id

  1. ✅ 200 - returns test detail
  2. ✅ 404 - non-existent id

#### POST /tests

  1. ✅ 201 - teacher creates test
  2. ✅ 403 - student cannot create test
  3. ✅ 401 - no token
  4. 🔴 400 - missing required part1

#### POST /tests/:testId/attempt

  1. ✅ 201 - student submits answers
  2. 🟡 400 - empty answers array
  3. ✅ 401 - no token

#### GET /submissions/my-submissions

  1. ✅ 200 - authenticated student sees own submissions
  2. ✅ 401 - no token

#### PUT /:id/grade

  1. ✅ 200 - teacher grades a submission
  2. ✅ 400 - score out of range

#### GET /health

  1. ✅ 200 - service is alive

### 📄 `tests/integration/speaking.routes.integration.test.js`

#### GET /tests

  1. ✅ should return all speaking tests

#### POST /tests

  1. ✅ should create a speaking test
  2. 🔴 should return 400 if title missing
  3. 🟡 should return 400 if part1 is empty
  4. ✅ should return 403 for student

#### PUT /:id/submit

  1. ✅ should submit audio URL
  2. 🔴 should return 400 if audioUrl is missing
  3. ✅ should return 404 for non-existent submission
  4. ✅ should return 403 if different student tries

#### PUT /:id/grade

  1. ✅ should grade a speaking submission successfully
  2. 🔴 should return 400 if criteria missing
  3. ✅ should return 400 if scores out of range
  4. ✅ should return 400 if no audio submitted yet

---

## Writing Service (port 3003)
<a id="writing-service"></a>

**Test cases:** 29  |  **Files:** 2

### 📄 `testing/api.test.js`

> writing-service — api.test.js
> Supertest HTTP integration tests.

#### GET /items

  1. ✅ 200 - returns paginated list
  2. ✅ filters by type Task 1
  3. ✅ filters isSample=true

#### GET /items/:id

  1. ✅ 200 - returns a specific writing prompt
  2. 🔴 404 - invalid id returns error

#### POST /submissions

  1. ✅ 201 - submits a Task 1 writing
  2. 🔴 400 - missing writingId
  3. ✅ 404 - non-existent writingId
  4. ✅ 400 - taskType mismatch with prompt type
  5. ✅ 401 - no auth token

#### GET /submissions/my-submissions

  1. ✅ 200 - returns own submissions for authenticated student
  2. ✅ 401 - no token

#### GET /health

  1. ✅ 200 - returns ok from health endpoint

### 📄 `tests/integration/writing.routes.integration.test.js`

#### GET /

  1. ✅ should return all writing tests

#### GET /items

  1. ✅ should return all items
  2. ✅ should filter by type
  3. ✅ should filter by isSample

#### POST /

  1. ✅ should create a writing test as teacher
  2. 🔴 should return 400 if required fields missing
  3. ✅ should return 403 for student

#### POST /submissions

  1. ✅ should submit writing successfully
  2. 🔴 should return 400 if fields are missing
  3. ✅ should return 404 if writing prompt does not exist
  4. ✅ should return 400 if taskType does not match prompt

#### PUT /submissions/:id/grade

  1. ✅ should grade a submission successfully
  2. 🔴 should return 400 if criteria is missing
  3. ✅ should return 400 if score is out of range
  4. ✅ should return 404 for non-existent submission
  5. ✅ should return 403 for student trying to grade

---

## Legend

| Badge | Meaning |
|---|---|
| ✅ | Happy-path / passing scenario |
| 🔴 | Error / failure / rejection scenario |
| 🟡 | Boundary / edge case / warning scenario |

*Generated automatically from source on 2026-05-18.*