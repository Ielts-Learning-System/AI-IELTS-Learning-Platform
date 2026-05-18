# Speaking Service — API Contract

**Base URL (via Gateway):** `/api/speaking`  
**Direct port:** 3008  
**Auth:** `Authorization: Bearer <JWT>`  (roles: `student` | `teacher` | `admin`)

---

## Health

### GET `/health`
Returns service liveness.

**Response 200:**
```json
{ "status": "OK", "message": "Speaking Service is healthy" }
```

---

## Test Management

### GET `/`
List all speaking tests (student-facing; only `_id`, `title`, `createdAt`).

**Auth:** None required

**Response 200:**
```json
{
  "success": true,
  "data": [
    { "_id": "...", "title": "IELTS Speaking Mock 1", "createdAt": "..." }
  ]
}
```

---

### GET `/tests`
List all speaking tests with full content + submission counts (teacher prompt bank).

**Auth:** `teacher` or `admin`

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "title": "IELTS Speaking Mock 1",
      "part1": ["What is your name?"],
      "part2": "Describe a place you visit often",
      "part3": ["Why do people travel?"],
      "submissionCount": 5,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

---

### GET `/tests/:id`
Get a single speaking test by ID.

**Auth:** Any

**Response 200:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "title": "IELTS Speaking Mock 1",
    "part1": ["What is your name?", "Where are you from?"],
    "part2": "Describe your favourite book",
    "part3": ["Do you think reading is important?"],
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Response 404:**
```json
{ "success": false, "message": "Speaking test not found" }
```

---

### POST `/tests`
Create a new speaking test.

**Auth:** `teacher` or `admin`

**Request body:**
```json
{
  "title": "IELTS Speaking Mock 2",
  "part1": ["Tell me about your hometown"],
  "part2": "Describe a skill you want to learn",
  "part3": ["Why is lifelong learning important?"]
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "Speaking test created successfully",
  "data": { "_id": "...", "title": "...", ... }
}
```

**Response 400** — validation failure (missing title, empty part1, etc.):
```json
{ "success": false, "message": "Title is required" }
```

**Response 403** — unauthorized role:
```json
{ "success": false, "message": "Forbidden" }
```

---

### PUT `/tests/:id`
Update an existing speaking test.

**Auth:** `teacher` or `admin`

**Request body:** Same fields as POST (all optional, only provided fields updated)

**Response 200:**
```json
{ "success": true, "data": { ... } }
```

---

### DELETE `/tests/:id`
Delete a speaking test.

**Auth:** `teacher` or `admin`

**Response 200:**
```json
{ "success": true, "message": "Speaking test deleted" }
```

---

## Student Submissions

### POST `/tests/:testId/attempt`
Start or update a student's attempt for a speaking test (upsert).

**Auth:** `student`, `teacher`, or `admin`

**Request body:**
```json
{
  "answers": [
    { "questionKey": "p1_0", "audioUrl": "https://res.cloudinary.com/..." },
    { "questionKey": "p2", "audioUrl": "https://res.cloudinary.com/..." }
  ]
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "studentId": "...",
    "testId": "...",
    "status": "Pending",
    "answers": [...],
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Response 400** — empty answers:
```json
{ "success": false, "message": "..." }
```

**Response 401** — no/invalid token:
```json
{ "message": "No token provided" }
```

---

### GET `/submissions/my-submissions`
Get all submissions belonging to the authenticated user.

**Auth:** Any authenticated user

**Response 200:**
```json
{
  "success": true,
  "data": [ { "_id": "...", "status": "Pending", ... } ]
}
```

---

## Teacher Grading

### GET `/pending`
List all pending submissions (awaiting grading).

**Auth:** `teacher` or `admin`

---

### GET `/graded`
List all graded submissions.

**Auth:** `teacher` or `admin`

---

### GET `/stats`
Submission statistics.

**Auth:** `teacher` or `admin`

---

### GET `/tests/:testId/submissions`
List all submissions for a specific test.

**Auth:** `teacher` or `admin`

---

### PUT `/:id/grade`
Grade a student submission.

**Auth:** `teacher` or `admin`

**Request body:**
```json
{
  "criteria": {
    "FC": 7,
    "LR": 6.5,
    "GRA": 7,
    "PR": 6.5
  },
  "teacherFeedback": "Good fluency, work on pronunciation"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "status": "Graded",
    "grading": {
      "FC": 7,
      "LR": 6.5,
      "GRA": 7,
      "PR": 6.5,
      "overallBand": 6.5,
      "teacherFeedback": "...",
      "gradedBy": "...",
      "gradedAt": "..."
    }
  }
}
```

**Response 400** — score out of range:
```json
{ "success": false, "message": "FC, LR, GRA, PR must be numbers between 0 and 9" }
```

---

## Legacy Assignment Flow (Soft-deprecated)

### POST `/assign`
Assign questions to a student directly (use `/tests/:testId/attempt` instead).

**Auth:** `teacher` or `admin`

### GET `/my-pending`
Get the authenticated student's oldest Pending submission.

### PUT `/:id/submit`
Upload audio URL for a legacy assigned submission.

**Request body:** `{ "audioUrl": "https://..." }`

---

## Error Response Shape
All errors follow:
```json
{ "success": false, "message": "<description>" }
```
Auth errors (401):
```json
{ "message": "No token provided" }
```
