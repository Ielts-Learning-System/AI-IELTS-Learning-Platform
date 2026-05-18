# Reading Service — Test Case Registry

> **Service**: `reading-service`  
> **Test framework**: Jest 29.7 + Supertest 7.1 + mongodb-memory-server 10.4  
> **Total files**: 5  
> **Generated**: 2026-05-15

---

## Table of Contents

1. [schema.test.js — Data Layer](#1-schematestjs--data-layer)
2. [unit.test.js — Business Logic Layer](#2-unittestjs--business-logic-layer)
3. [api.test.js — Integration / HTTP Layer](#3-apitestjs--integration--http-layer)
4. [e2e.test.js — End-to-End Journeys](#4-e2etestjs--end-to-end-journeys)
5. [regression.test.js — Edge Cases & Bug Prevention](#5-regressiontestjs--edge-cases--bug-prevention)
6. [Coverage Summary](#6-coverage-summary)

---

## 1. `schema.test.js` — Data Layer

**Scope**: Mongoose models `ReadingTest`, `passageSchema`, `questionSchema`, `ReadingAttempt`  
**Method**: Direct `model.save()` / `model.create()` — no HTTP layer  
**DB**: Own `MongoMemoryServer` instance

### Suite 1 — ReadingTest Schema

#### Required field validation

| # | Test Case ID | Description | Expected |
|---|---|---|---|
| 1 | SCH-RT-001 | Save with all required fields present | `_id` defined, `title` correct |
| 2 | SCH-RT-002 | Save without `title` | `ValidationError` |
| 3 | SCH-RT-003 | Save without `createdBy` | `ValidationError` |

#### Default values

| # | Test Case ID | Description | Expected |
|---|---|---|---|
| 4 | SCH-RT-004 | `isPublished` not supplied | Defaults to `false` |
| 5 | SCH-RT-005 | Auto timestamps | `createdAt` and `updatedAt` are `Date` instances |
| 6 | SCH-RT-006 | Empty `passages` array | Saves without error |

#### Data type handling

| # | Test Case ID | Description | Expected |
|---|---|---|---|
| 7 | SCH-RT-007 | `isPublished: true` explicitly set | Stored as `true` |
| 8 | SCH-RT-008 | String ObjectId for `createdBy` | Coerced to `ObjectId` type |
| 9 | SCH-RT-009 | Empty string `description` | Stored as `""` |

### Suite 2 — passageSchema

| # | Test Case ID | Description | Expected |
|---|---|---|---|
| 10 | SCH-PS-001 | Save passage with all required fields | `passageNumber`, `title`, `content` intact |
| 11 | SCH-PS-002 | Save without passage `title` | `ValidationError` |
| 12 | SCH-PS-003 | Save without passage `content` | `ValidationError` |
| 13 | SCH-PS-004 | Save without `passageNumber` | `ValidationError` |
| 14 | SCH-PS-005 | Optional `image` field absent | No error, `image` is `undefined` |
| 15 | SCH-PS-006 | Very long HTML in `content` (50 000 chars) | Saved, length > 50 000 |

### Suite 3 — questionSchema

| # | Test Case ID | Description | Expected |
|---|---|---|---|
| 16 | SCH-QS-001 | Save question with all required fields | `questionNumber`, `type`, `text`, `correctAnswer` intact |
| 17 | SCH-QS-002 | Invalid `type` value `"INVALID_TYPE"` | `ValidationError` |
| 18 | SCH-QS-003 | Valid enum type: `MULTIPLE_CHOICE` | Saved |
| 19 | SCH-QS-004 | Valid enum type: `FILL_IN_BLANK` | Saved |
| 20 | SCH-QS-005 | Valid enum type: `MATCHING` | Saved |
| 21 | SCH-QS-006 | Valid enum type: `TFNG` | Saved |
| 22 | SCH-QS-007 | Valid enum type: `YNNG` | Saved |
| 23 | SCH-QS-008 | Save without `questionNumber` | `ValidationError` |
| 24 | SCH-QS-009 | Save without `text` | `ValidationError` |
| 25 | SCH-QS-010 | Save without `correctAnswer` | `ValidationError` |
| 26 | SCH-QS-011 | Optional `explanation` absent | No error, `undefined` |
| 27 | SCH-QS-012 | Empty `options` array | Saved as `[]` |

### Suite 4 — ReadingAttempt Schema

#### Required field validation

| # | Test Case ID | Description | Expected |
|---|---|---|---|
| 28 | SCH-AT-001 | Save with all required fields | `_id` defined, scores correct |
| 29 | SCH-AT-002 | Save without `testId` | `ValidationError` |
| 30 | SCH-AT-003 | Save without `studentId` | `ValidationError` |
| 31 | SCH-AT-004 | Save without `rawScore` | `ValidationError` |
| 32 | SCH-AT-005 | Save without `bandScore` | `ValidationError` |

#### Default values

| # | Test Case ID | Description | Expected |
|---|---|---|---|
| 33 | SCH-AT-006 | `timeSpent` omitted | Defaults to `0` |
| 34 | SCH-AT-007 | `passageNumber` omitted | Defaults to `null` |
| 35 | SCH-AT-008 | `details` omitted | Defaults to `[]` |

#### Numeric constraints

| # | Test Case ID | Description | Expected |
|---|---|---|---|
| 36 | SCH-AT-009 | `rawScore: -1` | `ValidationError` |
| 37 | SCH-AT-010 | `bandScore: 9.5` | `ValidationError` |
| 38 | SCH-AT-011 | `bandScore: -0.5` | `ValidationError` |
| 39 | SCH-AT-012 | `timeSpent: -10` | `ValidationError` |
| 40 | SCH-AT-013 | `bandScore: 9` (upper boundary) | Saved |
| 41 | SCH-AT-014 | `bandScore: 0` (lower boundary) | Saved |

#### AttemptDetail subdocument

| # | Test Case ID | Description | Expected |
|---|---|---|---|
| 42 | SCH-AT-015 | Save detail with all required fields | `questionIndex`, `isCorrect`, `correctAnswer` intact |
| 43 | SCH-AT-016 | `studentAnswer` omitted from detail | Defaults to `""` |

**Suite total: 43 test cases**

---

## 2. `unit.test.js` — Business Logic Layer

**Scope**: `scoreConverter.js` (pure) + grading logic in `reading.controller.js`  
**Method**: Zero DB — all Mongoose models mocked with `jest.mock()`  
**DB**: None

### Suite 1 — `convertRawToBand(rawScore, moduleType)`

#### Band boundary values (IELTS standard table)

| # | Test Case ID | Input `rawScore` | Expected `bandScore` |
|---|---|---|---|
| 44 | UNIT-CB-001 | 0 | 1.5 |
| 45 | UNIT-CB-002 | 1 | 1.5 |
| 46 | UNIT-CB-003 | 2 | 2.0 |
| 47 | UNIT-CB-004 | 3 | 2.0 |
| 48 | UNIT-CB-005 | 4 | 2.5 |
| 49 | UNIT-CB-006 | 6 | 3.0 |
| 50 | UNIT-CB-007 | 8 | 3.5 |
| 51 | UNIT-CB-008 | 10 | 4.0 |
| 52 | UNIT-CB-009 | 13 | 4.5 |
| 53 | UNIT-CB-010 | 15 | 5.0 |
| 54 | UNIT-CB-011 | 19 | 5.5 |
| 55 | UNIT-CB-012 | 23 | 6.0 |
| 56 | UNIT-CB-013 | 26 (upper edge) | 6.0 |
| 57 | UNIT-CB-014 | 27 | 6.5 |
| 58 | UNIT-CB-015 | 30 | 7.0 |
| 59 | UNIT-CB-016 | 33 | 7.5 |
| 60 | UNIT-CB-017 | 35 | 8.0 |
| 61 | UNIT-CB-018 | 37 | 8.5 |
| 62 | UNIT-CB-019 | 39 | 9.0 |
| 63 | UNIT-CB-020 | 40 (max) | 9.0 |

#### Module type validation

| # | Test Case ID | Description | Expected |
|---|---|---|---|
| 64 | UNIT-CB-021 | `moduleType = "writing"` | Returns `0` |
| 65 | UNIT-CB-022 | `moduleType = "speaking"` | Returns `0` |
| 66 | UNIT-CB-023 | `moduleType = "listening"` | Returns `7.0` (raw 30) |
| 67 | UNIT-CB-024 | `moduleType = "READING"` (uppercase) | Returns `7.0` |
| 68 | UNIT-CB-025 | `moduleType` is `undefined` | Defaults to reading, returns `7.0` |

#### Defensive input handling

| # | Test Case ID | Description | Expected |
|---|---|---|---|
| 69 | UNIT-CB-026 | Negative score `-5` | Clamped to 0 → band `1.5` |
| 70 | UNIT-CB-027 | Score `999` (above max) | Clamped to 40 → band `9.0` |
| 71 | UNIT-CB-028 | Float `26.9` | Floored to 26 → band `6.0` |
| 72 | UNIT-CB-029 | `NaN` | Treated as 0 → band `1.5` |
| 73 | UNIT-CB-030 | String `"30"` | Coerced to 30 → band `7.0` |
| 74 | UNIT-CB-031 | `null` | Treated as 0 → band `1.5` |

### Suite 2 — `submitTest` grading logic (mocked DB)

#### rawScore calculation

| # | Test Case ID | Description | Expected |
|---|---|---|---|
| 75 | UNIT-ST-001 | All 3 answers wrong | `rawScore: 0`, `bandScore: 1.5` |
| 76 | UNIT-ST-002 | All 5 answers correct | `rawScore: 5` |
| 77 | UNIT-ST-003 | 3 correct out of 5 | `rawScore: 3`, `bandScore: 2.0` |
| 78 | UNIT-ST-004 | Empty `studentAnswers` array | `rawScore: 0` |

#### `isAnswerCorrect` — case / whitespace / alternate forms

| # | Test Case ID | Description | Expected |
|---|---|---|---|
| 79 | UNIT-ST-005 | `"true"` matches `"TRUE"` | `rawScore: 1`, `isCorrect: true` |
| 80 | UNIT-ST-006 | `"  B  "` matches `"B"` | `rawScore: 1` |
| 81 | UNIT-ST-007 | `"ten"` matches alternate `"10/ten"` | `rawScore: 1` |
| 82 | UNIT-ST-008 | `"10"` matches alternate `"10/ten"` | `rawScore: 1` |
| 83 | UNIT-ST-009 | `null` entry coerced to `""` | `rawScore: 0`, no crash |

#### details array structure

| # | Test Case ID | Description | Expected |
|---|---|---|---|
| 84 | UNIT-ST-010 | 3-question test → 3 detail entries | `details.length === 3` |
| 85 | UNIT-ST-011 | `questionIndex` starts at 1 (not 0) | `details[0].questionIndex === 1` |

#### Input validation guards

| # | Test Case ID | Description | Expected |
|---|---|---|---|
| 86 | UNIT-ST-012 | `studentAnswers` is a string | HTTP 400 |
| 87 | UNIT-ST-013 | Test does not exist (`findById` → `null`) | HTTP 404 |
| 88 | UNIT-ST-014 | DB throws error | HTTP 500, no crash |

### Suite 3 — `getAllTests` pagination (mocked DB)

| # | Test Case ID | Description | Expected |
|---|---|---|---|
| 89 | UNIT-GT-001 | `page=2&limit=5` | Pipeline `$skip=5`, `$limit=5` |
| 90 | UNIT-GT-002 | No query params | Pipeline `$skip=0`, `$limit=10` |

**Suite total: 47 test cases**

---

## 3. `api.test.js` — Integration / HTTP Layer

**Scope**: Every Express route in `reading.routes.js`  
**Method**: Supertest against real in-memory MongoDB  
**DB**: Own `MongoMemoryServer`, wiped after each test

### `GET /` — list all tests

| # | Test Case ID | Description | Expected |
|---|---|---|---|
| 91 | API-GL-001 | No tests in DB | `200`, `data: []`, `pagination.total: 0` |
| 92 | API-GL-002 | One test seeded | `200`, `data.length: 1`, `pagination.total: 1` |
| 93 | API-GL-003 | 3 tests, `?page=2&limit=2` | `200`, `data.length: 1`, `pagination.pages: 2` |
| 94 | API-GL-004 | List response security | `passages[].questions` is `undefined` (stripped) |

### `GET /:id` — test detail

| # | Test Case ID | Description | Expected |
|---|---|---|---|
| 95 | API-GI-001 | Existing test | `200`, full passages + questions |
| 96 | API-GI-002 | Non-existent ObjectId | `404`, `success: false` |
| 97 | API-GI-003 | Malformed id `"not-a-valid-objectid"` | `400` or `500` |

### `POST /` — create test

| # | Test Case ID | Description | Expected |
|---|---|---|---|
| 98 | API-CT-001 | Teacher token, valid payload | `201`, `data._id` defined |
| 99 | API-CT-002 | Admin token, valid payload | `201` |
| 100 | API-CT-003 | Missing `title` | `400`, `success: false` |
| 101 | API-CT-004 | Empty `passages` array | `400` |
| 102 | API-CT-005 | No `Authorization` header | `401` |
| 103 | API-CT-006 | Student token | `403` |

### `PUT /:id` — update test

| # | Test Case ID | Description | Expected |
|---|---|---|---|
| 104 | API-UT-001 | Owner (teacher) updates own test | `200`, `data.title` updated |
| 105 | API-UT-002 | Admin updates any test | `200` |
| 106 | API-UT-003 | Non-owner teacher tries to update | `403` |
| 107 | API-UT-004 | Non-existent test | `404` |

### `DELETE /:id` — delete test

| # | Test Case ID | Description | Expected |
|---|---|---|---|
| 108 | API-DT-001 | Owner deletes own test | `200`, document removed from DB |
| 109 | API-DT-002 | Non-owner teacher deletes | `403` |
| 110 | API-DT-003 | Non-existent test | `404` |

### `POST /:id/submit` — full test submission

| # | Test Case ID | Description | Expected |
|---|---|---|---|
| 111 | API-SS-001 | Student submits 2 correct answers | `201`, `rawScore: 2`, `bandScore: 2.0`, `details.length: 2` |
| 112 | API-SS-002 | All answers wrong | `201`, `rawScore: 0`, `bandScore: 1.5` |
| 113 | API-SS-003 | Empty `studentAnswers` | `201`, `rawScore: 0` |
| 114 | API-SS-004 | `studentAnswers` is string | `400` |
| 115 | API-SS-005 | No token | `401` |
| 116 | API-SS-006 | Non-existent test | `404` |

### `POST /:id/submit-passage` — single passage submission

| # | Test Case ID | Description | Expected |
|---|---|---|---|
| 117 | API-SP-001 | Student submits passage 1 (2 correct) | `201`, `passageNumber: 1`, `rawScore: 2` |
| 118 | API-SP-002 | `passageNumber: 0` | `400` |
| 119 | API-SP-003 | `passageNumber: 4` | `400` |
| 120 | API-SP-004 | `passageNumber: 2` (passage doesn't exist) | `404` |

### `GET /my-attempts` — student history

| # | Test Case ID | Description | Expected |
|---|---|---|---|
| 121 | API-MA-001 | Own attempt only (another student has attempt too) | `200`, `data.length: 1` |
| 122 | API-MA-002 | No token | `401` |

### `GET /attempts` — all attempts (teacher+)

| # | Test Case ID | Description | Expected |
|---|---|---|---|
| 123 | API-AA-001 | Teacher token | `200`, `Array.isArray(data)` |
| 124 | API-AA-002 | Student token | `403` |

### `GET /stats` — aggregate statistics

| # | Test Case ID | Description | Expected |
|---|---|---|---|
| 125 | API-ST-001 | Teacher requests stats (empty DB) | `200`, has `totalAttempts` + `avgBandScore` |
| 126 | API-ST-002 | After one attempt seeded | `totalAttempts: 1` |
| 127 | API-ST-003 | Student token | `403` |

**Suite total: 37 test cases**

---

## 4. `e2e.test.js` — End-to-End Journeys

**Scope**: Complete user workflows (black-box HTTP only)  
**Method**: Supertest — no model imports, no internals  
**DB**: Shared `MongoMemoryServer`, wiped between describe blocks

### Journey A — Full Reading Test lifecycle (7 steps)

| # | Test Case ID | Step | Description | Expected |
|---|---|---|---|---|
| 128 | E2E-A-001 | 1 | Teacher creates 5-question test | `201`, `passages[0].questions.length: 5` |
| 129 | E2E-A-002 | 2 | Student (no token) lists all tests | `200`, `data.length: 1`, `questions` stripped |
| 130 | E2E-A-003 | 3 | Student fetches test detail | `200`, 5 questions, `correctAnswer` defined |
| 131 | E2E-A-004 | 4 | Student submits 3 correct / 2 wrong | `201` |
| 132 | E2E-A-005 | 5 | Validate grading | `rawScore: 3`, `bandScore: 2.0`, `details.length: 5`, `details[0].isCorrect: true`, `details[3].isCorrect: false`, `timeSpent: 1800` |
| 133 | E2E-A-006 | 6 | Student fetches history | `200`, `data.length: 1`, same `_id` |
| 134 | E2E-A-007 | 7 | Teacher views all attempts | `200`, `data.length: 1`, correct `studentId` |

### Journey B — Single Passage Submission (3 steps)

| # | Test Case ID | Step | Description | Expected |
|---|---|---|---|---|
| 135 | E2E-B-001 | 1 | Teacher creates 2-passage test | `201` |
| 136 | E2E-B-002 | 2+3 | Student submits passage 1 (2/3 correct) | `201`, `passageNumber: 1`, `rawScore: 2`, `details.length: 3`, detail correctness pattern: `[true, false, true]` |
| 137 | E2E-B-003 | 4 | Stats reflect the new attempt | `200`, `totalAttempts: 1` |

### Journey C — Pagination and navigation (4 steps)

| # | Test Case ID | Step | Description | Expected |
|---|---|---|---|---|
| 138 | E2E-C-001 | 1 | Teacher creates 3 tests with distinct titles | `201` × 3 |
| 139 | E2E-C-002 | 2 | `GET /?page=1&limit=2` | `200`, `data.length: 2`, `pagination.total: 3`, `pagination.pages: 2` |
| 140 | E2E-C-003 | 3 | `GET /?page=2&limit=2` | `200`, `data.length: 1` |
| 141 | E2E-C-004 | 4 | Navigate to detail from list `_id` | `200`, `data._id` matches, `title` in known list |

### Journey D — Band score table via HTTP (7 cases)

| # | Test Case ID | `correctCount` / `total` | Expected `bandScore` |
|---|---|---|---|
| 142 | E2E-D-001 | 0 / 1 | 1.5 |
| 143 | E2E-D-002 | 2 / 5 | 2.0 |
| 144 | E2E-D-003 | 10 / 15 | 4.0 |
| 145 | E2E-D-004 | 23 / 30 | 6.0 |
| 146 | E2E-D-005 | 30 / 35 | 7.0 |
| 147 | E2E-D-006 | 39 / 40 | 9.0 |
| 148 | E2E-D-007 | 40 / 40 | 9.0 |

**Suite total: 21 test cases**

---

## 5. `regression.test.js` — Edge Cases & Bug Prevention

**Scope**: Known failure modes, security surface, data isolation  
**Method**: Supertest + direct model access  
**DB**: Own `MongoMemoryServer`

### R01 — Answer normalisation

| # | Test Case ID | Bug/Regression | Description | Expected |
|---|---|---|---|---|
| 149 | REG-R01-001 | BUG-PREV | `"true"` matches `"TRUE"` | `rawScore: 1`, `isCorrect: true` |
| 150 | REG-R01-002 | BUG-PREV | `"  B  "` (padded spaces) matches `"B"` | `rawScore: 1` |
| 151 | REG-R01-003 | BUG-PREV | Both halves of `"10/ten"` accepted independently | `rawScore: 2` |
| 152 | REG-R01-004 | BUG-PREV | `"TEN"` matches alternate `"10/ten"` | `rawScore: 1` |
| 153 | REG-R01-005 | REGRESSION | `"Not Given"` matches `"NOT GIVEN"` | `rawScore: 1` |
| 154 | REG-R01-006 | REGRESSION | Double-internal-space `"not  given"` vs `"not given"` | `201`, no crash, score `0` or `1` |

### R02 — Input boundary conditions

| # | Test Case ID | Bug/Regression | Description | Expected |
|---|---|---|---|---|
| 155 | REG-R02-001 | BUG-PREV | Empty `studentAnswers: []` | `201`, `rawScore: 0`, `bandScore: 1.5` |
| 156 | REG-R02-002 | BUG-PREV | `null` inside answers array | `201`, `rawScore: 0`, `isCorrect: false` |
| 157 | REG-R02-003 | BUG-PREV | Numeric `[1, 2]` coerced to `["1", "2"]` | `201`, `rawScore: 2` |
| 158 | REG-R02-004 | BUG-PREV | More answers than questions (5 vs 2) | `201`, `rawScore ≤ 2` |
| 159 | REG-R02-005 | REGRESSION | `undefined` entry (JSON → `null`) | `201`, no crash |

### R03 — Security / injection surface

| # | Test Case ID | Bug/Regression | Description | Expected |
|---|---|---|---|---|
| 160 | REG-R03-001 | BUG-PREV | XSS `<script>alert("xss")</script>` in answer | `201`, stored as-is, `rawScore: 0`, no crash |
| 161 | REG-R03-002 | BUG-PREV | Answer of 10 000 characters | `201`, `rawScore: 0`, no crash |
| 162 | REG-R03-003 | BUG-PREV | SQL-injection string `'; DROP TABLE users; --` | `201`, `rawScore: 0`, no crash |
| 163 | REG-R03-004 | BUG-PREV | NoSQL injection `?page[$gt]=0` in query string | `200`, normal result, no DB dump |

### R04 — Student data isolation

| # | Test Case ID | Bug/Regression | Description | Expected |
|---|---|---|---|---|
| 164 | REG-R04-001 | BUG-PREV | Student A sees only own attempts (B has one) | `data.length: 0` for A |
| 165 | REG-R04-002 | BUG-PREV | Both students see only their own attempt | Each gets `data.length: 1`; scores differ |

### R05 — `isPublished` default discrepancy

| # | Test Case ID | Bug/Regression | Description | Expected |
|---|---|---|---|---|
| 166 | REG-R05-001 | KNOWN-BUG | `POST /` without `isPublished` | `isPublished: true` (controller default, not schema's `false`) |
| 167 | REG-R05-002 | REGRESSION | `POST /` with `isPublished: false` | Stored as `false` |

### R06 — Edge-case HTTP routing

| # | Test Case ID | Bug/Regression | Description | Expected |
|---|---|---|---|---|
| 168 | REG-R06-001 | BUG-PREV | Submit to deleted `testId` | `404`, no crash |
| 169 | REG-R06-002 | BUG-PREV | `GET` with non-ObjectId string | `≥ 400`, not `200` |
| 170 | REG-R06-003 | BUG-PREV | `DELETE` already-deleted test | `404` |

### R07 — `submit-passage` boundary guards

| # | Test Case ID | Bug/Regression | Description | Expected |
|---|---|---|---|---|
| 171 | REG-R07-001 | BUG-PREV | `passageNumber: 0` | `400` |
| 172 | REG-R07-002 | BUG-PREV | `passageNumber: 4` (above max) | `400` |
| 173 | REG-R07-003 | BUG-PREV | `passageNumber: 2` on single-passage test | `404` |
| 174 | REG-R07-004 | BUG-PREV | `passageNumber: "1"` (string) | `201` or `400`, no crash |

### R08 — `timeSpent` negative clamping

| # | Test Case ID | Bug/Regression | Description | Expected |
|---|---|---|---|---|
| 175 | REG-R08-001 | BUG-PREV | `timeSpent: -500` | Stored as `0` |
| 176 | REG-R08-002 | REGRESSION | `timeSpent: 0` | Stored as `0` |
| 177 | REG-R08-003 | REGRESSION | `timeSpent: "300"` (string) | Coerced to `300` |

### R09 — Unicode and emoji in answers

| # | Test Case ID | Bug/Regression | Description | Expected |
|---|---|---|---|---|
| 178 | REG-R09-001 | BUG-PREV | Accented `"café"` matches correct answer `"café"` | `201`, `rawScore: 1` |
| 179 | REG-R09-002 | BUG-PREV | Emoji `"🎯"` in answer | `201`, `rawScore: 0`, no crash |
| 180 | REG-R09-003 | BUG-PREV | Vietnamese `"Không Đúng"` (multi-byte UTF-8) | `201`, `rawScore: 1` |
| 181 | REG-R09-004 | BUG-PREV | Null character `\u0000` in answer | `201`, `rawScore: 0`, no crash |

**Suite total: 33 test cases**

---

## 6. Coverage Summary

### By file

| File | Suites | Test Cases | Layer |
|------|--------|-----------|-------|
| `schema.test.js` | 4 | 43 | Data / Mongoose |
| `unit.test.js` | 3 | 47 | Business logic |
| `api.test.js` | 10 | 37 | HTTP / Integration |
| `e2e.test.js` | 4 | 21 | End-to-end journey |
| `regression.test.js` | 9 | 33 | Edge cases / Bug prevention |
| **Total** | **30** | **181** | |

### By concern

| Concern | Test Case IDs | Count |
|---------|--------------|-------|
| Schema validation (required, enum, min/max, defaults) | SCH-RT-001–009, SCH-PS-001–006, SCH-QS-001–012, SCH-AT-001–016 | 43 |
| Band score conversion (all 16 boundaries + edge cases) | UNIT-CB-001–031 | 31 |
| Answer grading (rawScore, isAnswerCorrect, details) | UNIT-ST-001–014 | 14 |
| Pagination logic | UNIT-GT-001–002, API-GL-001–004, E2E-C-001–004 | 8 |
| Auth guards (401 / 403) | API-CT-005–006, API-SS-005, API-MA-002, API-AA-002, API-ST-003 | 6 |
| Ownership check (403 non-owner) | API-UT-003, API-DT-002, REG-R06-001 | 3 |
| 404 paths | API-GI-002, API-UT-004, API-DT-003, API-SS-006, API-SP-004, REG-R06-001, REG-R06-003, REG-R07-003 | 8 |
| Full lifecycle journeys | E2E-A-001–007, E2E-B-001–003, E2E-D-001–007 | 17 |
| Security (XSS, injection, isolation) | REG-R03-001–004, REG-R04-001–002 | 6 |
| Boundary / robustness | REG-R02-001–005, REG-R07-001–004, REG-R08-001–003, REG-R09-001–004 | 16 |
| Known bugs (documented regressions) | REG-R05-001, REG-R06-002, REG-R01-005–006 | 4 |

### Run commands

```powershell
# Run only the new testing/ suite
npx jest --testPathPattern="testing/" --verbose

# Run with coverage
npx jest --testPathPattern="testing/" --coverage

# Run a single file
npx jest testing/regression.test.js --verbose

# Run all tests (tests/ + testing/)
npx jest
```
