# Listening Service — API Contract

**Base URL:** `http://localhost:3004`  
**Auth:** `Authorization: Bearer <JWT>` (where required)  
**Content-Type:** `application/json; charset=utf-8`

---

## Health

### `GET /health`
Returns service liveness.

**Response 200**
```json
{ "status": "ok", "service": "listening-service", "timestamp": "2024-01-01T00:00:00.000Z" }
```

---

## Tests

### `GET /`
List all listening tests (public).

**Query Parameters**
| Name | Default | Description |
|---|---|---|
| `page` | `1` | Page number |
| `limit` | `10` | Results per page |

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "title": "IELTS Listening Practice Test 1",
      "description": "Academic module",
      "partCount": 4,
      "totalQuestionCount": 40,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": { "total": 12, "page": 1, "limit": 10, "pages": 2 }
}
```

---

### `GET /:id`
Get test detail — correct answers hidden.

**Response 200**
```json
{
  "_id": "...",
  "title": "IELTS Listening Practice Test 1",
  "parts": [
    {
      "partNumber": 1,
      "title": "Social Conversation",
      "audioUrl": "https://cdn.example.com/audio/p1.mp3",
      "questions": [
        { "questionText": "What is the hotel name?", "type": "fill_blank" }
      ]
    }
  ]
}
```

**Response 404**
```json
{ "error": "Test not found" }
```

---

### `POST /`
Create a new listening test. **Requires:** `teacher` or `admin` role.

**Request Body**
```json
{
  "title": "Listening Practice 2",
  "description": "General Training module",
  "parts": [
    {
      "partNumber": 1,
      "title": "Part 1: Hotel Booking",
      "audioUrl": "https://cdn.example.com/p1.mp3",
      "questions": [
        {
          "questionText": "What is the caller's name?",
          "type": "fill_blank",
          "correctAnswer": "Johnson"
        },
        {
          "questionText": "Choose the room type",
          "type": "multiple_choice",
          "options": ["single", "double", "suite"],
          "correctAnswer": "double"
        }
      ]
    }
  ]
}
```

**Response 201** — plain test document  
**Response 400** — validation error  
**Response 401** — no/invalid token  
**Response 403** — insufficient role  

---

### `PUT /:id`
Update a test. **Requires:** `teacher` or `admin`.

**Response 200** — updated test document  
**Response 404** — test not found  

---

### `DELETE /:id`
Delete a test. **Requires:** `teacher` or `admin`.

**Response 200**
```json
{ "success": true, "message": "Đề thi Listening đã được xóa" }
```

---

## Submissions

### `POST /:id/submit`
Submit answers for the full test. **Requires:** `student` role.

**Request Body**
```json
{
  "studentAnswers": ["Johnson", "double", "B", "London"],
  "timeSpent": 1800
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "testId": { "_id": "...", "title": "..." },
    "studentId": "...",
    "rawScore": 30,
    "bandScore": 7.0,
    "timeSpent": 1800,
    "details": [
      { "questionIndex": 1, "studentAnswer": "johnson", "correctAnswer": "johnson", "isCorrect": true }
    ]
  }
}
```

---

### `POST /:id/submit-part`
Submit answers for a single part. **Requires:** `student` role.

**Request Body**
```json
{
  "partNumber": 1,
  "studentAnswers": ["Johnson", "double"],
  "timeSpent": 420
}
```

**Response 201** — same shape as `/submit` with `partNumber` set on attempt  
**Response 400** — `studentAnswers` not array, or `partNumber` outside 1–4  
**Response 404** — test or part not found  

---

## Attempts

### `GET /my-attempts`
Get the authenticated user's own attempt history. **Requires:** any authenticated role.

**Query Parameters**
| Name | Default | Description |
|---|---|---|
| `page` | `1` | Page number |
| `limit` | `10` | Results per page |

**Response 200**
```json
{
  "success": true,
  "data": [ { "testId": "...", "rawScore": 30, "bandScore": 7.0, "partNumber": null } ],
  "pagination": { "total": 5, "page": 1, "limit": 10, "pages": 1 }
}
```

---

### `GET /attempts`
Get all attempts (all students). **Requires:** `admin` or `teacher`.

**Response 200** — same pagination shape as `/my-attempts`

---

### `GET /stats`
Aggregate attempt statistics. **Requires:** `admin` or `teacher`.

**Response 200**
```json
{
  "success": true,
  "data": {
    "totalAttempts": 120,
    "averageBandScore": 6.3,
    "scoreDistribution": { "5.0": 10, "6.0": 35, "7.0": 45, "8.0": 20, "9.0": 10 }
  }
}
```
