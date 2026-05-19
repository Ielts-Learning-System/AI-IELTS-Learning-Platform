# 🔁 Regression Tests

> **Bug-prevention tests — each case documents a concrete past or high-risk failure**

| Field | Value |
|---|---|
| **Project** | IELTS-Mate Platform |
| **Framework** | Jest 29 · Supertest · mongodb-memory-server |
| **Test Scope** | Jest + Supertest + MongoMemoryServer · HTTP + data-layer boundary cases |
| **Total Test Cases** | **115** |
| **Test Files** | 10 |
| **Services Covered** | 10 / 11 |
| **Run Date** | 2026-05-18 |
| **All Passed** | ✅ 850 / 850 |

## What is Tested

Answer normalisation (case, whitespace, alternates), input boundary conditions
(empty, null, numeric), security surface (XSS, injection, long strings),
student data isolation, controller-default vs schema-default discrepancies,
and edge-case HTTP routing (deleted resources, invalid ObjectIds).

## Table of Contents

- [Auth Service (port 3001)](#auth-service)
- [Billing Service (port 3007)](#billing-service)
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

**Test cases:** 8  |  **Files:** 1

### 📄 `testing/regression.test.js`

> auth-service — regression.test.js
> Edge cases: injection, XSS, unicode, boundary values.

#### Security regression: injection & XSS

  1. ✅ should not crash on NoSQL injection in email field
  2. 🔴 should not crash on XSS in name field during registration
  3. ✅ should handle excessively long email gracefully

#### Boundary: password edge cases

  1. 🔴 empty password string is rejected
  2. ✅ very long password does not crash server

#### Unicode & internationalisation

  1. ✅ accepts Vietnamese characters in name
  2. ✅ normalises email to lowercase

#### Isolation: one user change does not affect another

  1. ✅ changing user A password does not affect user B login

---

## Billing Service (port 3007)
<a id="billing-service"></a>

**Test cases:** 22  |  **Files:** 1

### 📄 `tests/regression.test.js`

> Billing-service — Regression tests
> Covers: security, edge cases, auth boundaries, input sanitisation

#### Authentication security

  1. 🔴 rejects expired JWT
  2. 🔴 rejects JWT signed with wrong secret
  3. 🔴 rejects malformed token
  4. 🔴 rejects missing Authorization header
  5. 🔴 rejects token with wrong scheme

#### Role-based access control

  1. ✅ student cannot POST /admin/plans
  2. ✅ student cannot GET /admin/plans
  3. ✅ student cannot GET /admin/stats
  4. ✅ student cannot POST /admin/remind/:userId
  5. ✅ student cannot cancel subscription
  6. ✅ teacher role cannot access admin endpoints

#### Input validation and edge cases

  1. 🔴 POST /admin/plans rejects negative price
  2. ✅ PUT /admin/plans/:id with non-ObjectId returns 400 or 500
  3. 🟡 POST /internal/subscriptions/activate with empty object returns 400
  4. 🟡 POST /admin/subscriptions/:id/cancel with empty body returns 400

#### Idempotency and concurrent operations

  1. ✅ activating twice does not duplicate subscription
  2. ✅ plan code uniqueness enforced on duplicate create

#### Subscription edge cases

  1. ✅ cannot restore already-ACTIVE subscription
  2. 🔴 reminder 400 for invalid userId format
  3. ✅ cancel with all 3 valid reasons

#### NoSQL injection prevention

  1. ✅ handles injection-like planCode gracefully
  2. 🔴 handles XSS in plan name without crashing

---

## Exam Service (port 3006)
<a id="exam-service"></a>

**Test cases:** 6  |  **Files:** 1

### 📄 `tests/regression.test.js`

#### Exam regression/security

  1. 🔴 rejects malformed JWT
  2. 🔴 rejects token signed with wrong secret
  3. 🔴 rejects expired token
  4. 🔴 rejects student access to teacher endpoints
  5. ✅ allows admin role on teacher routes
  6. 🔴 SSE route rejects invalid query token

---

## Lesson Service (port 3011)
<a id="lesson-service"></a>

**Test cases:** 6  |  **Files:** 1

### 📄 `tests/regression.test.js`

#### Lesson regression/security

  1. 🔴 rejects malformed JWT on protected route
  2. 🔴 rejects missing token
  3. 🔴 returns 400 for invalid lesson id
  4. ✅ returns 404 for non-existing valid lesson id
  5. ✅ teacher search endpoint supports search query
  6. ✅ student cannot delete lesson (403)

---

## Listening Service (port 3004)
<a id="listening-service"></a>

**Test cases:** 7  |  **Files:** 1

### 📄 `testing/regression.test.js`

> listening-service — regression.test.js
> Edge cases, security, and robustness.

#### Security: NoSQL injection

  1. ✅ GET /:id with $gt operator does not return data
  2. ✅ GET / with injected query param is ignored

#### Security: forged JWT

  1. 🔴 forged token with wrong secret is rejected 401

#### Regression: empty answer arrays

  1. ✅ student can submit with no answers (should not crash)

#### Regression: Vietnamese characters in test title

  1. ✅ creates test with Vietnamese title

#### Regression: pagination limits

  1. ✅ limit=999 is capped by API (returns ≤50 results)

#### Regression: user isolation in my-attempts

  1. ✅ two students only see their own attempts

---

## Notification Service (port 3009)
<a id="notification-service"></a>

**Test cases:** 7  |  **Files:** 1

### 📄 `tests/regression.test.js`

#### Auth hardening

  1. 🔴 rejects malformed token on protected route
  2. 🔴 rejects wrong-secret token
  3. 🔴 rejects expired token

#### Ownership and input edges

  1. ✅ cannot mark notification from another user as read
  2. 🔴 invalid ObjectId in mark-as-read returns 500 (current behavior)
  3. ✅ teacher send validates required body fields

#### Pagination limits

  1. 🔴 caps limit at 100 and normalizes negative page

---

## Payment Service (port 3008)
<a id="payment-service"></a>

**Test cases:** 12  |  **Files:** 1

### 📄 `tests/regression.test.js`

> Payment-service — Regression tests
> Security, edge cases, auth boundaries

#### Authentication security

  1. 🔴 rejects expired JWT on protected routes
  2. 🔴 rejects wrong secret
  3. 🔴 rejects completely missing auth on all routes

#### Missing VietQR config

  1. 🔴 returns 500 when VietQR env vars are missing

#### Double approve/reject prevention

  1. ✅ cannot approve an already-approved transaction
  2. 🔴 cannot reject an already-rejected transaction

#### Input validation edge cases

  1. ✅ amount as string integer is accepted (coerced)
  2. 🔴 amount as Infinity is rejected
  3. 🔴 invalid ObjectId for approve returns 500 or 400
  4. 🔴 invalid ObjectId for reject returns 500 or 400

#### orderId uniqueness

  1. ✅ two rapid creates have different orderIds

#### Multiple pending transactions

  1. ✅ my-pending returns the LATEST (most recent) pending

---

## Reading Service (port 3002)
<a id="reading-service"></a>

**Test cases:** 33  |  **Files:** 1

### 📄 `testing/regression.test.js`

> REGRESSION TESTS — Edge Cases & Bug Prevention
> Purpose : Prevent previously-identified or high-risk bugs
> from regressing.  Every test here represents a
> concrete failure scenario that MUST NOT recur.
> Categories:
> R01  Answer normalisation (case · whitespace · alternates)
> R02  Input boundary conditions (empty · null · numeric)
> R03  Security / injection surface (XSS · long strings)
> R04  Student data isolation
> R05  Controller-default vs schema-default discrepancy
> R06  Edge-case HTTP routing (deleted resource · bad IDs)
> R07  submit-passage boundary guards

#### R01 — Answer normalisation

  1. ✅ BUG-PREV: "true" (lower-case) must match correctAnswer "TRUE"
  2. ✅ BUG-PREV: answer with leading spaces "  B  " must match "B"
  3. ✅ BUG-PREV: both halves of "10/ten" must be accepted independently
  4. ✅ BUG-PREV: "TEN" (upper-case) matches alternate "10/ten"
  5. ✅ REGRESSION: mixed-case "Not Given" matches "NOT GIVEN"
  6. ✅ REGRESSION: extra internal spaces do NOT prevent a correct match

#### R02 — Input boundary conditions

  1. 🟡 BUG-PREV: empty studentAnswers array returns rawScore=0, bandScore=1.5, no crash
  2. 🟡 BUG-PREV: null entry inside studentAnswers is coerced to "" (no crash)
  3. ✅ BUG-PREV: numeric answers in the array are coerced to strings (no crash)
  4. ✅ BUG-PREV: studentAnswers with more items than questions does not crash
  5. ✅ REGRESSION: undefined answer entry is handled gracefully (no crash)

#### R03 — Security / injection surface

  1. 🔴 BUG-PREV: XSS payload in studentAnswer is stored as-is, service does not crash
  2. ✅ BUG-PREV: very long answer (10 000 chars) does not crash the service
  3. ✅ BUG-PREV: SQL-injection-like string in answer is handled gracefully
  4. ✅ BUG-PREV: NoSQL-injection in query param does not expose all tests

#### R04 — Student data isolation

  1. ✅ BUG-PREV: Student A cannot see Student B\'s attempts via /my-attempts
  2. ✅ BUG-PREV: Two students submit separately; each sees only their own attempt

#### R05 — isPublished default discrepancy

  1. ✅ FIX: POST / without isPublished creates test with isPublished=false (schema default, bug fixed)
  2. ✅ REGRESSION: POST / with isPublished=false honours the explicit value

#### R06 — Edge-case HTTP routing

  1. ✅ BUG-PREV: submitting to a deleted testId returns 404 (not a crash)
  2. ✅ BUG-PREV: GET /:id with a non-ObjectId string returns 4xx or 5xx (not 200)
  3. ✅ BUG-PREV: DELETE /:id on already-deleted test returns 404

#### R07 — submit-passage boundary guards

  1. ✅ BUG-PREV: passageNumber=0 returns 400
  2. ✅ BUG-PREV: passageNumber=4 (above maximum) returns 400
  3. ✅ BUG-PREV: passageNumber=2 on a single-passage test returns 404
  4. ✅ BUG-PREV: passageNumber as string "1" is coerced and accepted (not 400)

#### R08 — timeSpent negative clamping

  1. 🔴 BUG-PREV: negative timeSpent is stored as 0 (not as a negative number)
  2. ✅ REGRESSION: timeSpent=0 (exactly) is stored as 0
  3. ✅ REGRESSION: timeSpent as string "300" is coerced to number 300

#### R09 — Unicode and emoji in answers

  1. ✅ BUG-PREV: accented character "café" in answer does not crash the service
  2. ✅ BUG-PREV: emoji "🎯" in answer does not crash the service
  3. ✅ BUG-PREV: Vietnamese answer "Không Đúng" does not crash (multi-byte UTF-8)
  4. 🟡 BUG-PREV: null character in answer (\u0000) does not crash the service

---

## Speaking Service (port 3005)
<a id="speaking-service"></a>

**Test cases:** 7  |  **Files:** 1

### 📄 `testing/regression.test.js`

> speaking-service — regression.test.js

#### Security: forged JWT

  1. 🔴 rejects wrong-secret token 401

#### Security: NoSQL injection in GET /tests/:id

  1. ✅ handles ObjectId injection gracefully

#### Regression: Vietnamese characters

  1. ✅ teacher creates test with Vietnamese parts

#### Regression: user isolation in my-submissions

  1. ✅ two students only see their own submissions

#### Regression: student re-submission upserts Pending attempt

  1. ✅ second submission updates existing Pending record

#### Regression: grading boundary validation

  1. ✅ grade of exactly 9 is valid
  2. ✅ grade of 0 is valid

---

## Writing Service (port 3003)
<a id="writing-service"></a>

**Test cases:** 7  |  **Files:** 1

### 📄 `testing/regression.test.js`

> writing-service — regression.test.js
> Edge cases, security, unicode, isolation.

#### Security: XSS and injection in submission content

  1. 🔴 stores XSS payload as plain text without executing
  2. ✅ handles MongoDB operator injection in writingId gracefully

#### Unicode: Vietnamese and CJK content

  1. ✅ accepts Vietnamese characters in submission content

#### Pagination boundary

  1. ✅ page=1, limit=5 returns 5 items
  2. ✅ page=2, limit=5 returns remaining items
  3. ✅ limit capped at 50 even if higher requested

#### Isolation: user A submissions invisible to user B

  1. ✅ student B sees zero submissions

---

## Legend

| Badge | Meaning |
|---|---|
| ✅ | Happy-path / passing scenario |
| 🔴 | Error / failure / rejection scenario |
| 🟡 | Boundary / edge case / warning scenario |

*Generated automatically from source on 2026-05-18.*