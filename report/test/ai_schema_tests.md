# 🗂️ Schema / Data-Layer Tests

> **Mongoose schema contract tests — data-layer validation only**

| Field | Value |
|---|---|
| **Project** | IELTS-Mate Platform |
| **Framework** | Jest 29 · Supertest · mongodb-memory-server |
| **Test Scope** | Jest + MongoMemoryServer · Direct model.save()/create() · No HTTP |
| **Total Test Cases** | **147** |
| **Test Files** | 10 |
| **Services Covered** | 10 / 11 |
| **Run Date** | 2026-05-18 |
| **All Passed** | ✅ 850 / 850 |

## What is Tested

Required fields, default values, enum constraints, unique indexes,
type coercion, embedded sub-document validation, and timestamps.
Catches schema regressions before they surface as 500 errors in production.

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

**Test cases:** 19  |  **Files:** 1

### 📄 `testing/schema.test.js`

> auth-service — schema.test.js
> Validates Mongoose model definitions: required fields, defaults, enums, validators.

#### Required fields

  1. ✅ should save a valid user
  2. 🔴 should reject a user without email
  3. 🔴 should reject a user without password

#### Defaults

  1. ✅ should default role to Student
  2. ✅ should default plan to FREE
  3. ✅ should default isActive to true
  4. 🟡 should default vipValidUntil to null

#### Enum validation

  1. ✅ should accept valid role: Admin
  2. ✅ should accept valid role: Teacher
  3. 🔴 should reject invalid role
  4. ✅ should accept plan PLUS
  5. ✅ should accept plan PRO
  6. 🔴 should reject invalid plan

#### Email normalization

  1. ✅ should lowercase email
  2. ✅ should enforce email uniqueness

#### Password hashing

  1. ✅ should hash the password on save
  2. ✅ matchPassword should return true for correct password
  3. 🔴 matchPassword should return false for wrong password

#### Timestamps

  1. ✅ should set createdAt and updatedAt

---

## Billing Service (port 3007)
<a id="billing-service"></a>

**Test cases:** 24  |  **Files:** 1

### 📄 `tests/schema.test.js`

> Billing-service — Schema validation tests
> Covers: Plan model, Subscription model

#### Plan Schema

  1. ✅ saves a valid plan with defaults
  2. 🔴 rejects missing code
  3. 🔴 rejects missing name
  4. 🔴 rejects missing price
  5. 🔴 rejects missing durationMonths
  6. ✅ enforces unique code
  7. 🔴 rejects invalid benefits.skills enum value
  8. ✅ accepts all four valid skill enum values
  9. ✅ saves ui sub-document
  10. ✅ stores features array
  11. ✅ sets timestamps

#### Subscription Schema

  1. ✅ saves a valid subscription with defaults
  2. 🔴 rejects missing userId
  3. 🔴 rejects missing planId
  4. 🔴 rejects missing validUntil
  5. 🔴 rejects invalid status enum
  6. ✅ accepts ACTIVE status
  7. ✅ accepts EXPIRED status
  8. ✅ accepts CANCELLED with valid reason
  9. ✅ accepts USER_REQUEST_REFUND reason
  10. 🔴 accepts SYSTEM_ERROR reason
  11. 🔴 rejects invalid cancellationReason
  12. ✅ enforces userId uniqueness
  13. ✅ sets timestamps

---

## Exam Service (port 3006)
<a id="exam-service"></a>

**Test cases:** 5  |  **Files:** 1

### 📄 `tests/schema.test.js`

#### Exam service schemas

  1. ✅ creates valid Exam with defaults
  2. 🔴 rejects invalid exam status
  3. ✅ creates valid ExamAttempt with IN_PROGRESS default
  4. ✅ creates valid SkillAttempt and enforces unique examAttemptId+skillType
  5. 🔴 rejects invalid skillType enum

---

## Lesson Service (port 3011)
<a id="lesson-service"></a>

**Test cases:** 4  |  **Files:** 1

### 📄 `tests/schema.test.js`

#### Lesson schema

  1. ✅ creates valid lesson with defaults
  2. 🔴 rejects missing required fields
  3. ✅ accepts youtube videoType
  4. 🔴 rejects invalid videoType enum

---

## Listening Service (port 3004)
<a id="listening-service"></a>

**Test cases:** 11  |  **Files:** 1

### 📄 `testing/schema.test.js`

> listening-service — schema.test.js

#### ListeningTest Schema

  1. ✅ saves a valid test
  2. 🔴 rejects missing title
  3. 🔴 rejects invalid question type
  4. ✅ accepts all valid question types
  5. ✅ requires audioUrl per part
  6. ✅ sets timestamps

#### ListeningAttempt Schema

  1. ✅ saves a valid attempt
  2. 🔴 rejects missing testId
  3. 🔴 rejects bandScore > 9
  4. ✅ accepts partNumber 1-4
  5. 🟡 defaults partNumber to null (full test)

---

## Notification Service (port 3009)
<a id="notification-service"></a>

**Test cases:** 7  |  **Files:** 1

### 📄 `tests/schema.test.js`

#### NotificationLog

  1. ✅ saves valid in-app notification
  2. 🔴 rejects invalid type enum
  3. 🔴 rejects invalid channel enum

#### NotificationPreference

  1. ✅ creates with default channel/category flags
  2. ✅ enforces unique userId

#### PushSubscription

  1. ✅ saves valid push subscription
  2. ✅ enforces unique userId + endpoint pair

---

## Payment Service (port 3008)
<a id="payment-service"></a>

**Test cases:** 12  |  **Files:** 1

### 📄 `tests/schema.test.js`

> Payment-service — Schema validation tests
> Covers: Transaction model

#### Transaction Schema

  1. ✅ saves a valid transaction with default status Pending
  2. 🔴 rejects missing orderId
  3. 🔴 rejects missing userId
  4. 🔴 rejects missing planId
  5. 🔴 rejects missing amount
  6. ✅ enforces unique orderId
  7. ✅ accepts Pending status
  8. ✅ accepts Success status
  9. 🔴 accepts Failed status
  10. 🔴 rejects invalid status enum
  11. ✅ stores transId when provided
  12. ✅ supports all PLAN_UPGRADE_CONFIG planIds as planId

---

## Reading Service (port 3002)
<a id="reading-service"></a>

**Test cases:** 38  |  **Files:** 1

### 📄 `testing/schema.test.js`

> SCHEMA TESTS — Data Layer Validation
> Scope  : Mongoose models ReadingTest (+ embedded passageSchema,
> questionSchema) and ReadingAttempt.
> Method : Drive documents through model.save() / model.create()
> directly — zero HTTP layer involvement.
> Goal   : Catch schema contract regressions before they surface
> as cryptic 500 errors in production.
> Setup  : Each test file owns its MongoMemoryServer so it can
> run in parallel isolation via Jest workers.

#### Required field validation

  1. ✅ saves successfully when all required fields are present
  2. 🔴 throws ValidationError when `title` is missing
  3. 🔴 throws ValidationError when `createdBy` is missing
  4. ✅ saves successfully when all required fields are present
  5. 🔴 throws ValidationError when `testId` is missing
  6. 🔴 throws ValidationError when `studentId` is missing
  7. 🔴 throws ValidationError when `rawScore` is missing
  8. 🔴 throws ValidationError when `bandScore` is missing

#### Default values

  1. ✅ defaults `isPublished` to false when not supplied
  2. ✅ auto-generates `createdAt` and `updatedAt` timestamps
  3. 🔴 allows an empty `passages` array without error
  4. ✅ defaults `timeSpent` to 0 when not provided
  5. 🟡 defaults `passageNumber` to null (full-test submission)
  6. 🟡 defaults `details` to an empty array when omitted

#### Data type handling

  1. ✅ accepts `isPublished: true` explicitly set
  2. ✅ coerces a string ObjectId for `createdBy` to ObjectId type
  3. 🟡 treats an empty string `description` as valid

#### passageSchema (embedded inside ReadingTest.passages)

  1. ✅ saves a passage with all required fields intact
  2. 🔴 throws ValidationError when passage `title` is missing
  3. 🔴 throws ValidationError when passage `content` is missing
  4. 🔴 throws ValidationError when passage `passageNumber` is missing
  5. ✅ does NOT require the optional `image` field
  6. ✅ accepts very long HTML content in the `content` field

#### questionSchema (embedded inside passageSchema.questions)

  1. ✅ saves a question with all required fields intact
  2. 🔴 rejects an unknown `type` value not in the enum
  3. 🔴 throws ValidationError when `questionNumber` is missing
  4. 🔴 throws ValidationError when `text` is missing
  5. 🔴 throws ValidationError when `correctAnswer` is missing
  6. ✅ does NOT require the optional `explanation` field
  7. 🟡 allows an empty `options` array (e.g. for FILL_IN_BLANK)

#### Numeric constraint validation

  1. 🔴 rejects `rawScore` below the minimum of 0
  2. 🔴 rejects `bandScore` above the maximum of 9
  3. 🔴 rejects `bandScore` below the minimum of 0
  4. 🔴 rejects `timeSpent` below the minimum of 0
  5. 🟡 accepts bandScore of exactly 9 (boundary value)
  6. 🟡 accepts bandScore of exactly 0 (boundary value)

#### AttemptDetail embedded subdocument

  1. ✅ saves detail entries with all required fields
  2. 🟡 defaults `studentAnswer` to an empty string in details

---

## Speaking Service (port 3005)
<a id="speaking-service"></a>

**Test cases:** 11  |  **Files:** 1

### 📄 `testing/schema.test.js`

> speaking-service — schema.test.js

#### SpeakingTest Schema

  1. ✅ saves a valid test
  2. 🔴 rejects missing title
  3. 🔴 rejects empty part1 array
  4. 🔴 rejects missing part2
  5. 🔴 rejects empty part3 array
  6. ✅ sets timestamps

#### SpeakingSubmission Schema

  1. ✅ saves a valid pending submission
  2. ✅ defaults status to Pending
  3. 🔴 rejects status outside enum
  4. ✅ requires studentId
  5. ✅ grading criteria are constrained 0-9

---

## Writing Service (port 3003)
<a id="writing-service"></a>

**Test cases:** 16  |  **Files:** 1

### 📄 `testing/schema.test.js`

> writing-service — schema.test.js
> Mongoose model validation tests.

#### Writing Schema

  1. ✅ saves a valid Task 1 prompt
  2. ✅ saves a valid Task 2 prompt
  3. 🔴 rejects missing title
  4. 🔴 rejects missing type
  5. 🔴 rejects invalid type enum
  6. 🔴 rejects missing contentHtml
  7. ✅ defaults isSample to false
  8. ✅ defaults timeLimit to 20 for Task 1
  9. ✅ defaults timeLimit to 40 for Task 2
  10. ✅ sets timestamps

#### WritingSubmission Schema

  1. ✅ saves a valid submission
  2. 🔴 rejects missing studentId
  3. 🔴 rejects invalid taskType
  4. ✅ defaults status to Pending
  5. ✅ accepts Graded status
  6. 🔴 rejects grading criteria out of band score range

---

## Legend

| Badge | Meaning |
|---|---|
| ✅ | Happy-path / passing scenario |
| 🔴 | Error / failure / rejection scenario |
| 🟡 | Boundary / edge case / warning scenario |

*Generated automatically from source on 2026-05-18.*