# writing-service — API Contract

Base URL (via API Gateway): `http://localhost:3000/api/writing`

Protected routes require: `Authorization: Bearer <token>`

---

## Writing Prompt Endpoints

### GET `/items`
List writing prompts (public).

**Query Params:** `type`, `isSample`, `page`, `limit` (max 50)

**Response 200**
```json
{ "data": [...], "currentPage": 1, "totalPages": 3, "totalItems": 15 }
```

---

### GET `/items/:id`
Get single writing prompt (public).

**Response 200** — Writing object  
**Response 404** — Not found

---

### GET `/:id`
Get writing detail for exam page (public).

---

### POST `/` _(Teacher/Admin)_
Create writing prompt.

**Body** `{ "title": "...", "type": "Task 1", "contentHtml": "<p>...</p>", "category": "Mixed" }`

**Response 201** `{ "success": true, "message": "...", "data": { ...writing } }`

---

### PUT `/:id` _(Teacher/Admin)_
Update writing prompt.

**Response 200** — Updated writing object

---

### DELETE `/:id` _(Teacher/Admin)_
Delete writing prompt.

**Response 200** `{ "success": true }`

---

### POST `/:id/samples` _(Teacher/Admin)_
Add sample essay to a prompt.

**Body** `{ "bandScore": 7.5, "contentHtml": "<p>Sample...</p>", "author": "IELTS Master" }`

**Response 201** — Updated writing with new sample

---

## Submission Endpoints

### POST `/submissions` _(Student)_
Submit a writing response.

**Body**
```json
{ "writingId": "664abc...", "taskType": "Task 1", "content": "The bar chart shows..." }
```

**Response 201**
```json
{
  "success": true,
  "message": "Writing submitted successfully",
  "data": { "_id": "...", "status": "Pending", "wordCount": 45, ... }
}
```

**Response 400** — Missing fields or `taskType` mismatch  
**Response 404** — `writingId` not found

---

### GET `/submissions/my-submissions` _(Student)_
Get own submission history.

**Response 200** `{ "success": true, "count": 3, "data": [...] }`

---

### GET `/submissions/pending` _(Teacher/Admin)_
List ungraded submissions.

---

### PUT `/submissions/:id/grade` _(Teacher/Admin)_
Grade a submission.

**Body**
```json
{
  "criteria": { "TR": 7, "CC": 7, "LR": 6, "GRA": 7 },
  "teacherFeedback": { "overall_feedback": "Good structure..." }
}
```

**Response 200** — Updated submission with grading and computed `overallBand`

---

### GET `/health`
**Response 200** `{ "status": "OK", "service": "writing-service" }`
