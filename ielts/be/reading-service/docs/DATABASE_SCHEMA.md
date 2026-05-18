# Database Schema — Reading Service

**Database:** `ielts_reading_db`  
**ODM:** Mongoose 8  
**Engine:** MongoDB 7  
**Service:** `reading-service` (port 3002)  
**Last Updated:** 2026-05-15

> **Isolation Rule:** No other service may read or write to `ielts_reading_db` directly.  
> Cross-service data access must go through the API Gateway (REST) or RabbitMQ (async).

---

## Collections Overview

| Collection | Mongoose Model | Purpose |
|---|---|---|
| `readingtests` | `ReadingTest` | Test definitions — passages and questions |
| `readingattempts` | `ReadingAttempt` | Student submission records and scores |

---

## 1. Collection: `readingtests`

Stores the full definition of an IELTS Reading test, including all passages and questions.

### 1.1 Top-Level Schema — `ReadingTest`

| Field | Type | Required | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `_id` | `ObjectId` | Auto | — | Unique | MongoDB auto-generated |
| `title` | `String` | ✅ | — | — | e.g. `"Cambridge IELTS 18 — Test 1 — Reading"` |
| `description` | `String` | ❌ | `""` | — | Optional summary shown on the test list page |
| `isPublished` | `Boolean` | ❌ | `false` | — | Schema default `false`; controller defaults to `true` on `POST /` if omitted ⚠️ |
| `passages` | `[passageSchema]` | ❌ | `[]` | — | Ordered array of passages (1–3 for IELTS Academic) |
| `createdBy` | `ObjectId` | ✅ | — | Ref: `User` (auth-service) | Set from JWT; not writable by client |
| `createdAt` | `Date` | Auto | `Date.now` | — | Added by `timestamps: true` |
| `updatedAt` | `Date` | Auto | `Date.now` | — | Added by `timestamps: true` |

> ⚠️ **Known Behaviour (BUG-01):** When `isPublished` is absent from the `POST /` request body, the controller explicitly sets it to `true`, overriding the schema's `false` default. This is intentional for the current UX flow but differs from the schema default.

---

### 1.2 Embedded Sub-document — `passageSchema`

Embedded inside `ReadingTest.passages[]`. Not a standalone collection.

| Field | Type | Required | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `_id` | `ObjectId` | Auto | — | — | Mongoose auto-adds `_id` to sub-documents |
| `passageNumber` | `Number` | ✅ | — | Integer 1–3 | Identifies the passage order within the test |
| `title` | `String` | ✅ | — | — | e.g. `"The History of Tea"` |
| `content` | `String` | ✅ | — | — | Full passage body; may contain HTML markup |
| `image` | `String` | ❌ | `undefined` | — | Optional URL to a diagram or figure |
| `questions` | `[questionSchema]` | ❌ | `[]` | — | All questions belonging to this passage |

---

### 1.3 Embedded Sub-document — `questionSchema`

Embedded inside `passageSchema.questions[]`. Not a standalone collection.

| Field | Type | Required | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `_id` | `ObjectId` | Auto | — | — | Auto-generated |
| `questionNumber` | `Number` | ✅ | — | Integer 1–40 | Global question number within the test |
| `type` | `String` | ✅ | — | Enum (see below) | IELTS question type |
| `text` | `String` | ✅ | — | — | The question prompt or statement |
| `options` | `[String]` | ❌ | `[]` | — | Answer choices; used for `MULTIPLE_CHOICE` and `MATCHING` |
| `correctAnswer` | `String` | ✅ | — | — | The expected answer for auto-grading |
| `explanation` | `String` | ❌ | `undefined` | — | Optional answer explanation for review mode |

**`type` Enum values:**

| Value | IELTS Question Type |
|---|---|
| `MULTIPLE_CHOICE` | Multiple-choice (A/B/C/D) |
| `FILL_IN_BLANK` | Gap-fill / sentence completion |
| `MATCHING` | Matching headings / features / information |
| `TFNG` | True / False / Not Given |
| `YNNG` | Yes / No / Not Given |

---

### 1.4 Indexes on `readingtests`

| Index | Fields | Type | Rationale |
|---|---|---|---|
| Default | `_id` | Unique | MongoDB default |
| Recommended | `createdBy` | Single-field | Filter tests by author (teacher dashboard) |
| Recommended | `isPublished` | Single-field | Filter published tests for student list |
| Recommended | `createdAt` | Single-field (desc) | Default sort for list endpoint |

---

### 1.5 Example Document

```json
{
  "_id": "664a1f2e3b4c5d6e7f8a9b0c",
  "title": "Cambridge IELTS 18 — Test 1 — Academic Reading",
  "description": "Full Academic Reading test from Cambridge IELTS 18.",
  "isPublished": true,
  "createdBy": "663f0a1b2c3d4e5f6a7b8c9d",
  "passages": [
    {
      "_id": "664a1f2e3b4c5d6e7f8a9b0d",
      "passageNumber": 1,
      "title": "The Future of Urban Farming",
      "content": "<p>Urban farming is the practice of cultivating food within a city...</p>",
      "image": null,
      "questions": [
        {
          "_id": "664a1f2e3b4c5d6e7f8a9b0e",
          "questionNumber": 1,
          "type": "TFNG",
          "text": "Urban farming can reduce a city's carbon footprint.",
          "options": [],
          "correctAnswer": "TRUE",
          "explanation": "The passage states in paragraph 3 that urban farms reduce transport emissions."
        },
        {
          "_id": "664a1f2e3b4c5d6e7f8a9b0f",
          "questionNumber": 2,
          "type": "FILL_IN_BLANK",
          "text": "The practice of growing food in cities is known as ______.",
          "options": [],
          "correctAnswer": "urban farming",
          "explanation": null
        }
      ]
    }
  ],
  "createdAt": "2026-05-10T08:30:00.000Z",
  "updatedAt": "2026-05-12T14:15:00.000Z"
}
```

---

## 2. Collection: `readingattempts`

Records each student submission with full answer details and computed scores.

### 2.1 Schema — `ReadingAttempt`

| Field | Type | Required | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `_id` | `ObjectId` | Auto | — | Unique | MongoDB auto-generated |
| `testId` | `ObjectId` | ✅ | — | Ref: `ReadingTest`, indexed | The test that was attempted |
| `studentId` | `ObjectId` | ✅ | — | Ref: `User`, indexed | Set from JWT; not writable by client |
| `studentAnswers` | `[String]` | ❌ | `[]` | — | Raw answers in submission order |
| `rawScore` | `Number` | ✅ | — | `min: 0` | Count of correct answers (0–40) |
| `bandScore` | `Number` | ✅ | — | `min: 0`, `max: 9` | Converted IELTS band (1.5–9.0) |
| `timeSpent` | `Number` | ❌ | `0` | `min: 0` | Seconds the student spent; clamped ≥ 0 |
| `passageNumber` | `Number` | ❌ | `null` | `null` or `1–3` | `null` = full-test; `1–3` = single-passage |
| `details` | `[AttemptDetailSchema]` | ❌ | `[]` | — | Per-question grading breakdown |
| `createdAt` | `Date` | Auto | `Date.now` | — | `timestamps: true` |
| `updatedAt` | `Date` | Auto | `Date.now` | — | `timestamps: true` |

---

### 2.2 Embedded Sub-document — `AttemptDetailSchema`

Embedded inside `ReadingAttempt.details[]`. No `_id` (`{ _id: false }`).

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `questionIndex` | `Number` | ✅ | — | 1-based position within the graded scope |
| `studentAnswer` | `String` | ❌ | `""` | Exactly what the student submitted |
| `correctAnswer` | `String` | ✅ | — | Snapshot of the correct answer at submission time |
| `isCorrect` | `Boolean` | ✅ | — | Result of `isAnswerCorrect()` comparison |

---

### 2.3 Indexes on `readingattempts`

| Index | Fields | Type | Rationale |
|---|---|---|---|
| Default | `_id` | Unique | MongoDB default |
| ✅ Defined | `testId` | Single-field | Aggregate attempts per test |
| ✅ Defined | `studentId` | Single-field | `GET /my-attempts` filter |
| Recommended | `createdAt` | Single-field (desc) | Default sort for history queries |

---

### 2.4 Example Document

```json
{
  "_id": "664b2a3c4d5e6f7a8b9c0d1e",
  "testId": {
    "_id": "664a1f2e3b4c5d6e7f8a9b0c",
    "title": "Cambridge IELTS 18 — Test 1 — Academic Reading"
  },
  "studentId": "663f0b2c3d4e5f6a7b8c9d0e",
  "studentAnswers": ["TRUE", "urban farming", "B", "NOT GIVEN"],
  "rawScore": 3,
  "bandScore": 2.0,
  "timeSpent": 1800,
  "passageNumber": null,
  "details": [
    {
      "questionIndex": 1,
      "studentAnswer": "true",
      "correctAnswer": "TRUE",
      "isCorrect": true
    },
    {
      "questionIndex": 2,
      "studentAnswer": "urban farming",
      "correctAnswer": "urban farming",
      "isCorrect": true
    },
    {
      "questionIndex": 3,
      "studentAnswer": "B",
      "correctAnswer": "A",
      "isCorrect": false
    },
    {
      "questionIndex": 4,
      "studentAnswer": "NOT GIVEN",
      "correctAnswer": "NOT GIVEN",
      "isCorrect": true
    }
  ],
  "createdAt": "2026-05-15T10:00:00.000Z",
  "updatedAt": "2026-05-15T10:00:00.000Z"
}
```

---

## 3. Band Score Conversion Table

Applied by `src/utils/scoreConverter.js`. Used by both `submitTest` and `submitPassage`.

| Raw Score (0–40) | Band Score |
|---|---|
| 39–40 | 9.0 |
| 37–38 | 8.5 |
| 35–36 | 8.0 |
| 33–34 | 7.5 |
| 30–32 | 7.0 |
| 27–29 | 6.5 |
| 23–26 | 6.0 |
| 19–22 | 5.5 |
| 15–18 | 5.0 |
| 13–14 | 4.5 |
| 10–12 | 4.0 |
| 8–9 | 3.5 |
| 6–7 | 3.0 |
| 4–5 | 2.5 |
| 2–3 | 2.0 |
| 0–1 | 1.5 |

> Non-numeric or out-of-range inputs are clamped to `[0, 40]` before lookup. Returns `0` if `moduleType` is neither `"reading"` nor `"listening"`.

---

## 4. Answer Normalisation Rules

Applied by `isAnswerCorrect()` in `reading.controller.js`:

1. Both student answer and correct answer are **lowercased** and **trimmed**.
2. If the correct answer contains `/` (e.g. `10/ten`), any of the slash-separated variants is accepted.
3. Comparison is strict string equality after normalisation — no partial matching.

**Examples:**

| Student Answer | Correct Answer | Result |
|---|---|---|
| `"  TRUE  "` | `"TRUE"` | ✅ Correct |
| `"true"` | `"TRUE"` | ✅ Correct |
| `"ten"` | `"10/ten"` | ✅ Correct |
| `"10"` | `"10/ten"` | ✅ Correct |
| `"TEN"` | `"10/ten"` | ✅ Correct (lowercased) |
| `"eleven"` | `"10/ten"` | ❌ Incorrect |
| `"Not Given"` | `"NOT GIVEN"` | ✅ Correct |
