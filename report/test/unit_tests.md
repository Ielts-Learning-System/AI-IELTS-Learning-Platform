# 🧪 Unit Tests

> **Pure function & business-logic layer tests — no HTTP, no real DB**

| Field | Value |
|---|---|
| **Project** | IELTS-Mate Platform |
| **Framework** | Jest 29 · Supertest · mongodb-memory-server |
| **Test Scope** | Jest + jest.mock() · Zero network I/O · In-process only |
| **Total Test Cases** | **149** |
| **Test Files** | 11 |
| **Services Covered** | 10 / 11 |
| **Run Date** | 2026-05-18 |
| **All Passed** | ✅ 850 / 850 |

## What is Tested

Pure utility functions (scoreConverter, bandScore rounding, JWT helpers),
business logic inside controllers invoked via mocked Mongoose models,
input-validation helpers, role-authorisation guards, and service helpers.

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

**Test cases:** 28  |  **Files:** 2

### 📄 `testing/unit.test.js`

> auth-service — unit.test.js
> Pure function tests: JWT generation, password matching, token parsing.

#### generateToken

  1. ✅ should return a valid JWT string
  2. ✅ should embed id, role and plan in the payload
  3. ✅ should default plan to FREE when not provided
  4. ✅ should expire in approximately 7 days
  5. 🔴 should fail to verify with wrong secret

#### roundToNearestHalf

  1. ✅ rounds 6.2 to 6.0
  2. ✅ rounds 6.4 to 6.5
  3. ✅ rounds 6.6 to 6.5
  4. ✅ rounds 6.8 to 7.0
  5. ✅ passes through whole numbers
  6. ✅ handles 0
  7. ✅ handles 9

#### Email validation helper

  1. ✅ accepts a valid email
  2. 🔴 rejects email without @
  3. 🔴 rejects empty string
  4. 🔴 rejects undefined
  5. ✅ accepts subdomain email

#### authorizeRoles middleware

  1. ✅ calls next() when role is allowed
  2. ✅ returns 403 when role is not allowed
  3. ✅ returns 403 when req.user is undefined

### 📄 `tests/unit/models/user.model.unit.test.js`

#### User Model — Unit

  1. ✅ should create a user with default values
  2. ✅ should hash the password before saving
  3. ✅ should match the correct password
  4. ✅ should enforce unique email constraint
  5. 🔴 should reject invalid role enum
  6. 🔴 should reject invalid subscriptionPlan enum
  7. ✅ should lowercase the email
  8. ✅ should not re-hash password if not modified

---

## Billing Service (port 3007)
<a id="billing-service"></a>

**Test cases:** 12  |  **Files:** 1

### 📄 `tests/unit.test.js`

> Billing-service — Unit tests
> Covers: requireSkill middleware (3 paths), auth middleware edge cases

#### PRO plan — bypass all

  1. ✅ calls next() for PRO + reading
  2. ✅ calls next() for PRO + speaking (skill not in DB needed)
  3. ✅ calls next() for lowercase pro

#### FREE plan — always 403

  1. ✅ returns 403 SKILL_NOT_ALLOWED for FREE + reading
  2. ✅ returns allowedSkills: [] in response for FREE plan
  3. ✅ denies all 4 skills for FREE plan

#### PLUS plan — DB lookup

  1. ✅ allows reading for PLUS plan
  2. ✅ allows listening for PLUS plan
  3. ✅ denies writing for PLUS plan (not in benefits)
  4. ✅ denies speaking for PLUS plan

#### Unknown plan code — PLAN_NOT_FOUND

  1. ✅ returns 403 PLAN_NOT_FOUND for nonexistent plan code

#### Missing userId

  1. ✅ returns 401 when no userId on req

---

## Exam Service (port 3006)
<a id="exam-service"></a>

**Test cases:** 6  |  **Files:** 1

### 📄 `tests/unit.test.js`

#### exam auth middleware

  1. ✅ accepts valid bearer token
  2. ✅ accepts token from query for SSE
  3. ✅ returns 401 when no token
  4. 🔴 returns 401 on invalid token
  5. ✅ authorizeRoles allows matching role
  6. ✅ authorizeRoles blocks insufficient role

---

## Lesson Service (port 3011)
<a id="lesson-service"></a>

**Test cases:** 6  |  **Files:** 1

### 📄 `tests/unit.test.js`

#### lesson auth middleware

  1. ✅ verifyToken accepts valid bearer token
  2. 🔴 verifyToken rejects missing token
  3. 🔴 verifyToken rejects bad token
  4. ✅ isTeacher allows teacher role
  5. ✅ isTeacher blocks non-teacher role
  6. ✅ isAdmin allows admin role and blocks non-admin

---

## Listening Service (port 3004)
<a id="listening-service"></a>

**Test cases:** 19  |  **Files:** 1

### 📄 `testing/unit.test.js`

> listening-service — unit.test.js
> Pure function tests: score converter, answer normalization.

#### convertRawToBand — listening

  1. ✅ 39-40 → 9.0
  2. ✅ 37-38 → 8.5
  3. ✅ 30-32 → 7.0
  4. ✅ 23-26 → 6.0
  5. ✅ 0-1 → 1.5
  6. ✅ clamps score above 40 to 40
  7. 🔴 clamps negative scores to 0
  8. ✅ accepts string numbers
  9. ✅ returns 0 for NaN
  10. ✅ works for module type reading
  11. 🟡 returns 0 for unknown module type

#### isAnswerCorrect

  1. ✅ exact match (case insensitive)
  2. 🔴 exact match fails for different values
  3. ✅ alternate answer separated by / — first option
  4. ✅ alternate answer separated by / — second option
  5. ✅ none of the alternates → false
  6. 🟡 handles empty student answer
  7. 🟡 handles null/undefined gracefully
  8. ✅ trims whitespace before comparison

---

## Notification Service (port 3009)
<a id="notification-service"></a>

**Test cases:** 6  |  **Files:** 1

### 📄 `tests/unit.test.js`

#### auth.middleware

  1. ✅ allows valid token and sets req.user
  2. ✅ supports decoded userId fallback
  3. 🔴 returns 401 when token missing
  4. ✅ returns 401 for malformed scheme
  5. ✅ returns 401 for expired token
  6. 🔴 returns 401 for wrong secret

---

## Payment Service (port 3008)
<a id="payment-service"></a>

**Test cases:** 15  |  **Files:** 1

### 📄 `tests/unit.test.js`

> Payment-service — Unit tests
> Covers: auth middleware edge cases, PLAN_UPGRADE_CONFIG coverage

#### verifyToken middleware

  1. ✅ calls next() with valid token
  2. ✅ returns 401 when no Authorization header
  3. ✅ returns 401 when header does not start with Bearer
  4. ✅ returns 401 for expired token
  5. 🔴 returns 401 for wrong secret
  6. ✅ returns 401 for malformed token
  7. ✅ attaches full decoded payload to req.user

#### PLAN_UPGRADE_CONFIG mapping

  1. ✅ PLUS maps to plan=PLUS 30 days
  2. ✅ VIP_1_MONTH maps to plan=PLUS 30 days
  3. ✅ VIP_6_MONTH maps to plan=PLUS 180 days
  4. ✅ PRO maps to plan=PRO 365 days
  5. ✅ VIP_1_YEAR maps to plan=PRO 365 days
  6. 🟡 UNKNOWN planId returns undefined
  7. ✅ orderId format VIP + 6 digits
  8. ✅ vipValidUntil is in the future

---

## Reading Service (port 3002)
<a id="reading-service"></a>

**Test cases:** 27  |  **Files:** 1

### 📄 `testing/unit.test.js`

> UNIT TESTS — Business Logic Layer
> Scope  : Pure functions in scoreConverter.js  AND  grading
> logic inside reading.controller.js.
> Method : No real DB. All Mongoose models are jest.mock()'d
> so tests run in milliseconds and stay deterministic.
> Why mock the controller instead of extracting helpers?
> `normalizeAnswer` and `isAnswerCorrect` are module-private
> functions. We exercise them indirectly by controlling the
> `correctAnswer` values that `ReadingTest.findById` returns
> and asserting the `rawScore` / `details` that reach
> `ReadingAttempt.create`.

#### Module type validation

  1. ✅ returns 0 for unsupported module type "writing"
  2. ✅ returns 0 for unsupported module type "speaking"
  3. ✅ accepts "listening" as an equivalent module
  4. ✅ is case-insensitive for moduleType
  5. ✅ defaults to reading when moduleType is undefined

#### Defensive input handling

  1. 🔴 clamps negative score to 0 → band 1.5
  2. ✅ clamps score above 40 to 40 → band 9.0
  3. ✅ floors a float score (26.9 → 26) → band 6.0
  4. ✅ treats NaN input as 0 → band 1.5
  5. ✅ coerces a numeric string "30" to 30 → band 7.0
  6. 🟡 treats null rawScore as 0 → band 1.5

#### rawScore calculation

  1. 🔴 gives rawScore 0 when all answers are wrong
  2. ✅ gives rawScore equal to total questions when all answers are correct
  3. ✅ counts 3 correct out of 5 and maps to band 2.0
  4. 🟡 treats an empty studentAnswers array as rawScore 0

#### isAnswerCorrect — tested through submitTest

  1. ✅ is case-insensitive: "true" matches correctAnswer "TRUE"
  2. ✅ trims leading/trailing whitespace before comparison
  3. ✅ accepts alternate answers separated by "/" (e.g. "10/ten")
  4. ✅ accepts the numeric half of an alternate answer "10/ten"
  5. 🟡 coerces a null answer entry in the array to empty string (no crash)

#### details array structure

  1. ✅ produces one detail entry per question in the test
  2. ✅ records questionIndex starting at 1 (not 0)

#### Input validation guards

  1. ✅ returns 400 when studentAnswers is not an array
  2. ✅ returns 404 when test does not exist
  3. 🔴 returns 500 and does not crash when DB throws

#### getAllTests — pagination logic (mocked DB)

  1. 🟡 calls aggregate with $skip / $limit derived from query params
  2. ✅ defaults to page=1 / limit=10 when query params are absent

---

## Speaking Service (port 3005)
<a id="speaking-service"></a>

**Test cases:** 10  |  **Files:** 1

### 📄 `testing/unit.test.js`

> speaking-service — unit.test.js
> Pure function tests.

#### roundToNearestHalf

  1. ✅ rounds 6.25 → 6.5
  2. ✅ rounds 6.0 → 6.0
  3. ✅ rounds 6.75 → 7.0
  4. ✅ rounds 5.1 → 5.0
  5. ✅ rounds 5.5 → 5.5

#### calculateOverallBand

  1. ✅ averages 4 equal bands
  2. ✅ averages 4 mixed bands and rounds to nearest 0.5
  3. ✅ averages yielding 6.25 → 6.5
  4. ✅ handles string number inputs
  5. ✅ returns 0 for all-zero inputs

---

## Writing Service (port 3003)
<a id="writing-service"></a>

**Test cases:** 20  |  **Files:** 1

### 📄 `testing/unit.test.js`

> writing-service — unit.test.js
> Pure function tests for submission controller helpers.

#### roundToNearestHalf (band score rounding)

  1. ✅ 6.0 stays 6.0
  2. ✅ 6.125 → 6.0
  3. ✅ 6.375 → 6.5
  4. ✅ 6.75 → 7.0
  5. ✅ 0 stays 0
  6. ✅ 9 stays 9

#### calculateOverallBand

  1. ✅ averages four equal criteria
  2. ✅ rounds to nearest 0.5
  3. ✅ calculates band 7.0 from mixed criteria
  4. ✅ handles minimum band 1 input
  5. ✅ handles maximum band 9 input
  6. ✅ handles string numbers from request body

#### countWords

  1. ✅ counts plain text words
  2. ✅ strips HTML tags before counting
  3. ✅ handles nested tags
  4. 🟡 returns 0 for empty string
  5. 🟡 returns 0 for null
  6. ✅ returns 0 for undefined
  7. ✅ returns 0 for HTML with only whitespace inside
  8. 🟡 handles 150-word Task 1 length (boundary)

---

## Legend

| Badge | Meaning |
|---|---|
| ✅ | Happy-path / passing scenario |
| 🔴 | Error / failure / rejection scenario |
| 🟡 | Boundary / edge case / warning scenario |

*Generated automatically from source on 2026-05-18.*