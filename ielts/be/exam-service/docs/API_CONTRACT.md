# API Contract — Exam Service

Base path: /
Auth: Bearer JWT (or token query fallback on specific SSE route)

## 1. Health
### GET /health
Response 200
```json
{ "success": true, "service": "exam-service" }
```

## 2. Student/General Routes (Roles: student, teacher, admin)
### GET /exams
Returns exam list visible to user.

### POST /exams/:examId/start
Starts exam attempt.

### GET /attempts/:attemptId
Returns attempt detail.

### POST /attempts/:attemptId/skills/:skillType/start
Starts skill attempt.

### PUT /attempts/:attemptId/skills/:skillType/snapshot
Stores in-progress answer snapshot.

### POST /attempts/:attemptId/skills/:skillType/submit
Submits one skill.

### POST /attempts/:attemptId/submit
Submits full exam.

## 3. Teacher/Admin Routes (Roles: teacher, admin)
### GET /teacher/exams
List teacher-managed exams.

### GET /teacher/exams/orchestrate-progress/:jobId
Fetch/stream orchestration progress.
Note: supports token query parameter for EventSource clients.

### POST /teacher/exams
Create exam draft.

### POST /teacher/exams/:examId/publish
Publish draft exam.

### DELETE /teacher/exams/:examId
Delete exam.

### POST /teacher/exams/orchestrate-pdf
Multipart fields:
- fullExamPdf (maxCount=1)
- answerKeyPdf (maxCount=1)

### GET /teacher/monitoring/attempts
List active monitoring attempts.

### GET /teacher/students/:userId/attempts
Get attempt history for one student.

### GET /teacher/attempts/:attemptId
Get one attempt details for teacher view.

### POST /teacher/attempts/:attemptId/grade
Grade attempt and persist grading result.

## 4. Common Error Responses
### 401 Unauthorized
```json
{ "success": false, "message": "Not authorized, no token" }
```
or
```json
{ "success": false, "message": "Not authorized, token failed" }
```

### 403 Forbidden
```json
{ "success": false, "message": "Forbidden: insufficient role" }
```

### 500 Internal Error
```json
{ "success": false, "message": "Internal server error" }
```
