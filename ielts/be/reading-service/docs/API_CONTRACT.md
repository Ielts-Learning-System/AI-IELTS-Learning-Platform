# API Contract — Reading Service

**Base URL (via API Gateway):** `http://localhost:3000/api/reading`  
**Direct URL (internal):** `http://reading-service:3002/api/reading`  
**Content-Type:** `application/json; charset=utf-8`  
**Auth:** Bearer JWT in `Authorization: Bearer <token>` header  
**Version:** 1.0  
**Last Updated:** 2026-05-15

---

## Authentication & Authorization

| Role | Capabilities |
|---|---|
| Guest (no token) | `GET /` · `GET /:id` |
| `student` | All Guest endpoints + `POST /:id/submit` · `POST /:id/submit-passage` · `GET /my-attempts` |
| `teacher` | All Student endpoints + `POST /` · `PUT /:id` · `DELETE /:id` · `GET /attempts` · `GET /stats` · `POST /generate-ai` |
| `admin` | Full access to all endpoints |

**Error responses for auth failures:**

```json
// 401 — no token or invalid token
{ "success": false, "message": "No token provided" }

// 403 — valid token but insufficient role
{ "success": false, "message": "Forbidden: insufficient role" }
```

---

## Endpoints

---

### GET /

**Description:** List all reading tests with pagination. No authentication required.

**Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number (1-based) |
| `limit` | integer | `10` | Items per page |

**Response — 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "664a1f2e3b4c5d6e7f8a9b0c",
      "title": "Cambridge IELTS 18 — Test 1 — Academic Reading",
      "description": "Full Academic Reading test from Cambridge IELTS 18.",
      "isPublished": true,
      "createdAt": "2026-05-10T08:30:00.000Z",
      "createdBy": "663f0a1b2c3d4e5f6a7b8c9d",
      "passageCount": 3,
      "totalQuestionCount": 40,
      "passages": [
        { "passageNumber": 1, "title": "The Future of Urban Farming", "questionCount": 13 },
        { "passageNumber": 2, "title": "The Psychology of Colour", "questionCount": 13 },
        { "passageNumber": 3, "title": "Deep Sea Exploration", "questionCount": 14 }
      ]
    }
  ],
  "pagination": {
    "total": 42,
    "page": 1,
    "limit": 10,
    "pages": 5
  }
}
```

> ⚠️ `correctAnswer` and full passage `content` are **NOT** included in list responses.

---

### GET /:id

**Description:** Get full details of a single test including all passages and questions. No authentication required.

**Path Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `id` | ObjectId string | The test `_id` |

**Response — 200 OK:**

```json
{
  "success": true,
  "data": {
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
            "explanation": "See paragraph 3."
          }
        ]
      }
    ],
    "createdAt": "2026-05-10T08:30:00.000Z",
    "updatedAt": "2026-05-12T14:15:00.000Z"
  }
}
```

**Response — 404 Not Found:**

```json
{ "success": false, "message": "Đề thi không tìm thấy" }
```

---

### POST /

**Description:** Create a new reading test. Requires `teacher` or `admin` role.

**Request Headers:**

```
Authorization: Bearer <jwt_token>
Content-Type: application/json; charset=utf-8
```

**Request Body:**

```json
{
  "title": "Cambridge IELTS 18 — Test 1 — Academic Reading",
  "description": "Full Academic Reading test from Cambridge IELTS 18.",
  "isPublished": true,
  "passages": [
    {
      "passageNumber": 1,
      "title": "The Future of Urban Farming",
      "content": "<p>Urban farming is the practice of cultivating food within a city...</p>",
      "image": null,
      "questions": [
        {
          "questionNumber": 1,
          "type": "TFNG",
          "text": "Urban farming can reduce a city's carbon footprint.",
          "options": [],
          "correctAnswer": "TRUE",
          "explanation": "See paragraph 3."
        },
        {
          "questionNumber": 2,
          "type": "FILL_IN_BLANK",
          "text": "The practice of growing food in cities is known as ______.",
          "options": [],
          "correctAnswer": "urban farming/urban agriculture"
        }
      ]
    }
  ]
}
```

**Request Body Fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | ✅ | Test name |
| `description` | string | ❌ | Defaults to `""` |
| `isPublished` | boolean | ❌ | Defaults to `true` in controller if omitted |
| `passages` | array | ✅ | At least 1 passage required |
| `passages[].passageNumber` | number | ✅ | 1–3 |
| `passages[].title` | string | ✅ | — |
| `passages[].content` | string | ✅ | HTML or plain text |
| `passages[].image` | string | ❌ | URL |
| `passages[].questions[].questionNumber` | number | ✅ | 1–40 |
| `passages[].questions[].type` | string (enum) | ✅ | `MULTIPLE_CHOICE` · `FILL_IN_BLANK` · `MATCHING` · `TFNG` · `YNNG` |
| `passages[].questions[].text` | string | ✅ | — |
| `passages[].questions[].options` | string[] | ❌ | For MCQ/MATCHING |
| `passages[].questions[].correctAnswer` | string | ✅ | Supports `A/B` alternates |
| `passages[].questions[].explanation` | string | ❌ | — |

**Response — 201 Created:**

```json
{
  "success": true,
  "message": "Đề thi đã tạo thành công",
  "data": { /* full ReadingTest document */ }
}
```

**Response — 400 Bad Request:**

```json
{ "success": false, "message": "Thiếu title hoặc passages" }
```

---

### PUT /:id

**Description:** Update an existing test. Only the owner (`createdBy`) or an `admin` may update.

**Path Parameters:** `id` — ObjectId of the test.

**Request Body** (all fields optional — only supplied fields are updated):

```json
{
  "title": "Cambridge IELTS 18 — Test 2 — Academic Reading",
  "description": "Updated description.",
  "isPublished": false,
  "passages": [ /* full replacement passage array */ ]
}
```

**Response — 200 OK:**

```json
{
  "success": true,
  "message": "Đề thi đã cập nhật thành công",
  "data": { /* updated ReadingTest document */ }
}
```

**Error Responses:**

| Status | Condition |
|---|---|
| `400` | Validation error (e.g. invalid `type` enum) |
| `403` | Authenticated but not owner or admin |
| `404` | Test not found |

---

### DELETE /:id

**Description:** Permanently delete a test. Only the owner or an `admin` may delete.

**Response — 200 OK:**

```json
{
  "success": true,
  "message": "Đề thi đã được xóa thành công"
}
```

**Error Responses:**

| Status | Condition |
|---|---|
| `403` | Not owner or admin |
| `404` | Test not found |

---

### POST /:id/submit

**Description:** Submit answers for a full reading test. Triggers auto-grading. Requires `student` role.

**Request Body:**

```json
{
  "studentAnswers": ["TRUE", "urban farming", "B", "NOT GIVEN", "C"],
  "timeSpent": 2700
}
```

**Request Body Fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `studentAnswers` | string[] | ✅ | Ordered array aligned to all questions across all passages |
| `timeSpent` | number | ❌ | Seconds spent; clamped to `≥ 0`, defaults to `0` |

**Response — 201 Created:**

```json
{
  "success": true,
  "data": {
    "_id": "664b2a3c4d5e6f7a8b9c0d1e",
    "testId": {
      "_id": "664a1f2e3b4c5d6e7f8a9b0c",
      "title": "Cambridge IELTS 18 — Test 1 — Academic Reading"
    },
    "studentId": "663f0b2c3d4e5f6a7b8c9d0e",
    "rawScore": 32,
    "bandScore": 7.0,
    "timeSpent": 2700,
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
      }
    ],
    "createdAt": "2026-05-15T10:00:00.000Z"
  }
}
```

**Error Responses:**

| Status | Condition |
|---|---|
| `400` | `studentAnswers` is not an array |
| `401` | No token |
| `403` | Non-student role |
| `404` | Test not found |

---

### POST /:id/submit-passage

**Description:** Submit answers for a single passage. Scores only the questions in that passage. Requires `student` role.

**Request Body:**

```json
{
  "passageNumber": 1,
  "studentAnswers": ["TRUE", "urban farming", "B"],
  "timeSpent": 900
}
```

**Request Body Fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `passageNumber` | integer | ✅ | Must be `1`, `2`, or `3` |
| `studentAnswers` | string[] | ✅ | Ordered answers for questions in the specified passage |
| `timeSpent` | number | ❌ | Seconds spent on this passage |

**Response — 201 Created:** Same structure as `POST /:id/submit`, with `passageNumber` populated.

**Error Responses:**

| Status | Condition |
|---|---|
| `400` | `studentAnswers` not an array |
| `400` | `passageNumber` not in `{1, 2, 3}` |
| `401` | No token |
| `403` | Non-student role |
| `404` | Test not found |
| `404` | Specified passage does not exist in test |

---

### GET /my-attempts

**Description:** Get the authenticated student's own attempt history. Requires any authenticated role.

**Response — 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "664b2a3c4d5e6f7a8b9c0d1e",
      "testId": {
        "_id": "664a1f2e3b4c5d6e7f8a9b0c",
        "title": "Cambridge IELTS 18 — Test 1 — Academic Reading"
      },
      "rawScore": 32,
      "bandScore": 7.0,
      "timeSpent": 2700,
      "passageNumber": null,
      "createdAt": "2026-05-15T10:00:00.000Z"
    }
  ]
}
```

> Results are sorted by `createdAt` descending. Students only see their own data.

---

### GET /attempts

**Description:** Get all student attempts across all tests. Requires `teacher` or `admin` role.

**Response — 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "664b2a3c4d5e6f7a8b9c0d1e",
      "testId": { "_id": "...", "title": "Cambridge IELTS 18 — Test 1" },
      "studentId": "663f0b2c3d4e5f6a7b8c9d0e",
      "rawScore": 32,
      "bandScore": 7.0,
      "timeSpent": 2700,
      "passageNumber": null,
      "createdAt": "2026-05-15T10:00:00.000Z"
    }
  ]
}
```

---

### GET /stats

**Description:** Get aggregate statistics on all reading attempts. Requires `teacher` or `admin` role.

**Response — 200 OK:**

```json
{
  "success": true,
  "data": {
    "totalAttempts": 1247,
    "avgBandScore": 5.83
  }
}
```

| Field | Type | Notes |
|---|---|---|
| `totalAttempts` | integer | Total count of all `ReadingAttempt` documents |
| `avgBandScore` | float (2 dp) | Mean band score across all attempts; `0` if no attempts |

---

### POST /generate-ai

**Description:** Generate a complete IELTS Reading test using Google Gemini AI. Requires `teacher` or `admin` role.

**Request Body:**

```json
{
  "topic": "renewable energy",
  "difficulty": "advanced",
  "passageCount": 1,
  "questionCount": 13
}
```

**Response — 201 Created:**

```json
{
  "success": true,
  "data": { /* fully-formed ReadingTest document ready for review */ }
}
```

**Response — 500 Internal Server Error** (Gemini key not configured):

```json
{
  "success": false,
  "message": "Gemini API key is not configured. Please set it in Admin → AI Manager."
}
```

---

### GET /health

**Description:** Health check endpoint. No authentication required.

**Response — 200 OK:**

```json
{
  "status": "ok",
  "service": "reading-service",
  "timestamp": "2026-05-15T10:00:00.000Z"
}
```

---

## Error Response Envelope

All error responses follow this consistent shape:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "Technical error detail (development only)"
}
```

## HTTP Status Code Reference

| Code | Meaning | When used |
|---|---|---|
| `200` | OK | Successful GET, PUT, DELETE |
| `201` | Created | Successful POST creating a resource |
| `400` | Bad Request | Validation failure, malformed body |
| `401` | Unauthorized | Missing or invalid JWT |
| `403` | Forbidden | Valid JWT but insufficient role or not owner |
| `404` | Not Found | Resource (`testId`, `passageNumber`) does not exist |
| `500` | Internal Server Error | Unhandled server error or external dependency failure |
