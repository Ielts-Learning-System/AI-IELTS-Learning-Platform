# 🔄 End-to-End (E2E) Tests

> **Black-box journey tests — service treated as a complete unit**

| Field | Value |
|---|---|
| **Project** | IELTS-Mate Platform |
| **Framework** | Jest 29 · Supertest · mongodb-memory-server |
| **Test Scope** | Jest + Supertest + MongoMemoryServer · No internal imports · Pure HTTP |
| **Total Test Cases** | **60** |
| **Test Files** | 10 |
| **Services Covered** | 10 / 11 |
| **Run Date** | 2026-05-18 |
| **All Passed** | ✅ 850 / 850 |

## What is Tested

Complete user journeys: teacher creates → student fetches → student submits → results verified.
Multi-step flows that cross controller/service/model boundaries.
State shared between steps via closure variables (ids, tokens).

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

**Test cases:** 10  |  **Files:** 1

### 📄 `testing/e2e.test.js`

> auth-service — e2e.test.js
> Black-box user journey tests.

#### Journey: Student registers, logs in, views profile

  1. ✅ Step 1 — registers successfully
  2. ✅ Step 2 — logs in with correct credentials
  3. ✅ Step 3 — views own profile
  4. ✅ Step 4 — changes password
  5. ✅ Step 5 — can log in with new password
  6. 🔴 Step 6 — old password rejected after change

#### Journey: Duplicate registration is blocked

  1. ✅ Step 1 — first registration succeeds
  2. 🔴 Step 2 — second registration with same email fails

#### Journey: Token guard protects profile endpoint

  1. ✅ No token → 401
  2. 🔴 Invalid token → 401

---

## Billing Service (port 3007)
<a id="billing-service"></a>

**Test cases:** 5  |  **Files:** 1

### 📄 `tests/e2e.test.js`

> Billing-service — E2E tests
> Full lifecycle: admin creates plan → internal activates → student checks subscription/skills
> → admin manages → cancels → restores

#### E2E: Plan management lifecycle

  1. ✅ creates → reads public → updates → toggles → deletes

#### E2E: Subscription activation and skill access

  1. ✅ FREE user gets no skills → internal activates PLUS → user gets skills

#### E2E: Admin cancel and restore subscription

  1. ✅ admin cancels active → validates → restores → active again

#### E2E: Billing statistics accuracy

  1. ✅ stats increase after subscriptions are created

#### E2E: Subscription expiry reminder

  1. ✅ admin sends reminder for expiring subscription

---

## Exam Service (port 3006)
<a id="exam-service"></a>

**Test cases:** 2  |  **Files:** 1

### 📄 `tests/e2e.test.js`

#### Exam E2E route flows

  1. ✅ student flow: start exam -> start skill -> snapshot -> submit skill -> submit exam
  2. ✅ teacher flow: list exams -> create -> publish -> monitoring -> grade

---

## Lesson Service (port 3011)
<a id="lesson-service"></a>

**Test cases:** 3  |  **Files:** 1

### 📄 `tests/e2e.test.js`

#### Lesson E2E flow

  1. ✅ teacher creates published lesson -> student can list and fetch by id
  2. ✅ teacher creates draft lesson -> hidden from student list but visible in teacher list
  3. ✅ teacher deletes lesson successfully

---

## Listening Service (port 3004)
<a id="listening-service"></a>

**Test cases:** 7  |  **Files:** 1

### 📄 `testing/e2e.test.js`

> listening-service — e2e.test.js
> Black-box journey tests.

#### Journey: Teacher creates test, student submits a part

  1. ✅ Step 1 — Teacher creates a 4-part listening test
  2. ✅ Step 2 — Test appears in public list
  3. ✅ Step 3 — Student views the test detail
  4. ✅ Step 4 — Student submits Part 1 answers
  5. ✅ Step 5 — Student can view own attempts

#### Journey: Role gates prevent unauthorized access

  1. ✅ student cannot create a test
  2. ✅ unauthenticated user cannot submit a part

---

## Notification Service (port 3009)
<a id="notification-service"></a>

**Test cases:** 3  |  **Files:** 1

### 📄 `tests/e2e.test.js`

#### Notification E2E flows

  1. ✅ student lifecycle: list -> read one -> unread count decreases -> read all
  2. ✅ teacher workflow: send to student -> teacher can query target user notifications
  3. ✅ public fallback behavior keeps client stable without token

---

## Payment Service (port 3008)
<a id="payment-service"></a>

**Test cases:** 3  |  **Files:** 1

### 📄 `tests/e2e.test.js`

> Payment-service — E2E tests
> Full lifecycle: create payment → approve → reject → full flow

#### E2E: Student creates payment → admin approves → Success

  1. ✅ full PLUS approval flow

#### E2E: Student creates payment → admin rejects → Failed

  1. 🔴 full rejection flow

#### E2E: Multiple users - pending isolation

  1. ✅ each student only sees their own pending transaction

---

## Reading Service (port 3002)
<a id="reading-service"></a>

**Test cases:** 14  |  **Files:** 1

### 📄 `testing/e2e.test.js`

> E2E TESTS — Complete User Journey (Black-Box)
> Philosophy : This suite treats the service as a black box.
> No model imports.  No internals.  Only HTTP calls via
> Supertest — exactly as a real client would interact.
> Journeys covered:
> Journey A  Full Reading Test — teacher creates, student
> fetches, submits, views results, checks history.
> Journey B  Single Passage — student works through one
> passage and verifies partial scoring.
> Journey C  Pagination flow — teacher pages through a list
> of tests and navigates to a detail view.
> Each journey is a series of ordered `it` steps inside a

#### Journey A — Full Reading Test lifecycle

  1. ✅ Step 1: Teacher creates a reading test with 5 questions
  2. ✅ Step 2: Student (no token needed) lists all tests and sees the new test
  3. ✅ Step 3: Student fetches test detail (including questions but not yet graded)
  4. 🔴 Step 4: Student submits answers (3 correct, 2 wrong)
  5. ✅ Step 5: Grading result — rawScore=3, bandScore=2.0, details correct
  6. ✅ Step 6: Student history shows exactly one attempt
  7. ✅ Step 7: Teacher sees all attempts and finds the student submission

#### Journey B — Single passage submission

  1. ✅ Step 1: Teacher creates a test with 2 passages
  2. ✅ Step 2 & 3: Student submits passage 1 (2/3 correct) and grading is accurate
  3. ✅ Step 4: Stats reflect the new passage attempt

#### Journey C — Pagination and navigation

  1. ✅ Step 1: Teacher creates 3 tests
  2. ✅ Step 2: Page 1 with limit=2 returns 2 tests
  3. ✅ Step 3: Page 2 with limit=2 returns the remaining 1 test
  4. ✅ Step 4: Student navigates to detail of a test from the list

---

## Speaking Service (port 3005)
<a id="speaking-service"></a>

**Test cases:** 7  |  **Files:** 1

### 📄 `testing/e2e.test.js`

> speaking-service — e2e.test.js

#### Journey: full speaking flow

  1. ✅ Step 1 — Teacher creates a speaking test
  2. ✅ Step 2 — Test appears in public list
  3. ✅ Step 3 — Student submits per-question audio answers
  4. ✅ Step 4 — Student sees submission in history
  5. ✅ Step 5 — Teacher grades the submission

#### Journey: role gates

  1. ✅ student cannot create a test
  2. ✅ unauthenticated cannot view my-submissions

---

## Writing Service (port 3003)
<a id="writing-service"></a>

**Test cases:** 6  |  **Files:** 1

### 📄 `testing/e2e.test.js`

> writing-service — e2e.test.js
> Black-box user journey tests.

#### Journey: Student submits writing and retrieves history

  1. ✅ Step 1 — Teacher creates a writing prompt
  2. ✅ Step 2 — Student views the prompt
  3. ✅ Step 3 — Student submits a Task 1 response
  4. ✅ Step 4 — Student sees submission in history

#### Journey: Task type mismatch is blocked

  1. ✅ Step 1 — Create Task 2 prompt
  2. 🔴 Step 2 — Submitting Task 1 against Task 2 prompt is rejected

---

## Legend

| Badge | Meaning |
|---|---|
| ✅ | Happy-path / passing scenario |
| 🔴 | Error / failure / rejection scenario |
| 🟡 | Boundary / edge case / warning scenario |

*Generated automatically from source on 2026-05-18.*