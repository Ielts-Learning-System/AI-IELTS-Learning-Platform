# PHỤ LỤC F — Đặc tả API và Sơ đồ Cơ sở Dữ liệu

> **Dự án:** IELTS-Mate Platform  
> **Phiên bản:** 1.0 — 2026-05-18  
> **Base URL (qua Gateway):** `http://localhost:3000/api`  
> **Auth:** Bearer JWT trong header `Authorization: Bearer <token>`

Chi tiết đầy đủ:
- [api-specification.md](api-specification.md) — 151 endpoints, tất cả request/response formats
- [database-schema.md](database-schema.md) — 11 MongoDB schemas với field definitions và indexes

---

## F.1 Tổng quan API

### Phân bổ endpoints theo service

| Service | Port | Số endpoints | Nhóm chức năng |
|---|---|---|---|
| auth-service | 3001 | 25 | Register, login, profile, RBAC, admin system-config/api-keys, internal |
| reading-service | 3002 | 11 | CRUD tests, submit, attempts, stats |
| writing-service | 3003 | 18 | CRUD tasks/items/samples, submit, grade, submission history |
| listening-service | 3004 | 14 | CRUD tests, dictation grading, submit per-part, attempts |
| speaking-service | 3005 | 16 | CRUD prompts, upload audio, score, history, admin |
| exam-service | 3006 | 18 | Full mock exam, skill submission, teacher monitoring, grade |
| billing-service | 3007 | 25 | Plan CRUD (admin), subscriptions, resources/tags, internal activate |
| payment-service | 3008 | 6 | Create payment, webhook, history |
| notification-service | 3009 | 10 | List, mark-read, mark-all-read, preferences, templates |
| cloud-media-service | 3010 | 3 | Upload, list files, delete |
| lesson-service | 3011 | 5 | CRUD lessons |
| **Tổng** | | **151** | |

### Quy ước chung

| Quy tắc | Chi tiết |
|---|---|
| Format | `Content-Type: application/json; charset=utf-8` |
| Auth | `Authorization: Bearer <JWT>` cho protected routes |
| Pagination | Query params: `?page=1&limit=10` |
| Error response | `{ "error": "message", "code": "ERROR_CODE" }` |
| Success | `{ "data": {...}, "message": "success" }` hoặc trực tiếp object |
| Timestamps | ISO 8601 UTC — `2026-05-18T10:30:00.000Z` |

---

## F.2 Bảng tổng hợp endpoints quan trọng

### Auth Service (:3001)

| Method | Path | Auth | Role | Mô tả |
|---|---|---|---|---|
| POST | /auth/register | ❌ | — | Đăng ký tài khoản mới |
| POST | /auth/login | ❌ | — | Đăng nhập, nhận JWT |
| GET | /auth/profile | ✅ | Any | Lấy thông tin tài khoản |
| PUT | /auth/profile | ✅ | Any | Cập nhật name, avatar |
| PUT | /auth/change-password | ✅ | Any | Đổi mật khẩu |
| PUT | /auth/update-role/:id | ✅ | Admin | Thay đổi role người dùng |
| PATCH | /auth/internal/users/:id/subscription | Internal | — | Cập nhật plan sau thanh toán |
| GET | /health | ❌ | — | Health check |

### Reading Service (:3002)

| Method | Path | Auth | Role | Mô tả |
|---|---|---|---|---|
| GET | /reading-tests | ❌ | — | Danh sách bài thi (published) |
| GET | /reading-tests/:id | ❌ | — | Chi tiết bài thi |
| POST | /reading-tests | ✅ | Teacher/Admin | Tạo bài thi mới |
| PUT | /reading-tests/:id | ✅ | Teacher/Admin | Cập nhật bài thi |
| DELETE | /reading-tests/:id | ✅ | Admin | Xóa bài thi |
| PATCH | /reading-tests/:id/publish | ✅ | Teacher/Admin | Publish/unpublish |
| POST | /reading-tests/:id/submit | ✅ | Student | Nộp bài, nhận band score |
| GET | /reading-attempts/my | ✅ | Student | Lịch sử làm bài của tôi |
| GET | /reading-attempts/:id | ✅ | Any | Chi tiết một attempt |
| GET | /reading-attempts/test/:testId | ✅ | Teacher/Admin | Tất cả attempts của một đề |
| GET | /reading-tests/:id/stats | ✅ | Teacher/Admin | Thống kê đề thi |

### Writing Service (:3003)

| Method | Path | Auth | Role | Mô tả |
|---|---|---|---|---|
| GET | /writing-tasks | ❌ | — | Danh sách writing prompts |
| GET | /writing-tasks/:id | ❌ | — | Chi tiết prompt |
| POST | /writing-tasks | ✅ | Teacher/Admin | Tạo writing prompt |
| PUT | /writing-tasks/:id | ✅ | Teacher/Admin | Cập nhật prompt |
| POST | /writing-submissions | ✅ | Student | Nộp bài viết (→ RabbitMQ) |
| GET | /writing-submissions/:id | ✅ | Any | Lấy kết quả chấm điểm |
| GET | /writing-submissions/my | ✅ | Student | Lịch sử nộp bài |
| PUT | /writing-submissions/:id/grade | ✅ | Teacher/Admin | Override AI grade |
| GET | /writing-submissions/task/:taskId | ✅ | Teacher/Admin | Tất cả bài nộp theo task |
| GET | /health | ❌ | — | Health check |

---

## F.3 Chi tiết Request/Response Examples

### POST /auth/register

**Request:**
```json
{
  "email": "nguyen.van.a@example.com",
  "password": "securePass123",
  "name": "Nguyễn Văn A"
}
```

**Response 201:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "nguyen.van.a@example.com",
    "name": "Nguyễn Văn A",
    "role": "Student",
    "plan": "FREE",
    "isActive": true,
    "createdAt": "2026-05-18T10:30:00.000Z"
  }
}
```

---

### POST /reading-tests/:id/submit

**Request:**
```json
{
  "answers": [
    { "questionId": "q1", "answer": "TRUE" },
    { "questionId": "q2", "answer": "B" },
    { "questionId": "q3", "answer": "industrial revolution" }
  ],
  "timeSpent": 3420
}
```

**Response 200:**
```json
{
  "attemptId": "507f1f77bcf86cd799439099",
  "testId": "507f1f77bcf86cd799439011",
  "studentId": "507f1f77bcf86cd799439022",
  "rawScore": 32,
  "bandScore": 7.0,
  "totalQuestions": 40,
  "correctAnswers": 32,
  "timeSpent": 3420,
  "details": [
    { "questionId": "q1", "studentAnswer": "TRUE", "correctAnswer": "TRUE", "isCorrect": true, "points": 1 },
    { "questionId": "q2", "studentAnswer": "B", "correctAnswer": "C", "isCorrect": false, "points": 0 }
  ],
  "createdAt": "2026-05-18T10:45:00.000Z"
}
```

---

### POST /writing-submissions

**Request:**
```json
{
  "taskId": "507f1f77bcf86cd799439055",
  "taskType": "TASK_2",
  "content": "In many developed countries, the number of people choosing to live alone has increased significantly over recent decades. There are several reasons why this trend has emerged, and both positive and negative effects on society have been observed. Firstly, economic independence has allowed more individuals, particularly young adults, to afford solo living arrangements..."
}
```

**Response 202:**
```json
{
  "submissionId": "507f1f77bcf86cd799439077",
  "status": "pending",
  "message": "Bài viết của bạn đang được AI chấm điểm. Vui lòng kiểm tra lại sau vài phút.",
  "estimatedTime": "2-3 phút"
}
```

**GET /writing-submissions/:id (sau khi chấm xong):**
```json
{
  "_id": "507f1f77bcf86cd799439077",
  "status": "graded",
  "content": "In many developed countries...",
  "wordCount": 312,
  "grading": {
    "TR": 7.0,
    "CC": 6.5,
    "LR": 7.0,
    "GRA": 6.5,
    "bandScore": 7.0,
    "feedback": "Your essay demonstrates a clear understanding of the topic. Task achievement is good, but coherence between paragraphs could be improved...",
    "suggestions": [
      "Use more varied discourse markers (Furthermore, In contrast, Nevertheless)",
      "Develop your counterargument in paragraph 3 with more specific examples",
      "Aim for more complex sentence structures"
    ]
  },
  "gradedAt": "2026-05-18T10:48:30.000Z"
}
```

---

## F.4 Tổng quan Database

Chi tiết đầy đủ tại [database-schema.md](database-schema.md).

### Thống kê Database

| Database | Collections | Documents | Mô tả |
|---|---|---|---|
| ielts_auth_db | 4 | 35 | users, refreshTokens, apiKeys, auditLogs |
| ielts_reading_db | 2 | 20 | readingtests, readingattempts |
| ielts_writing_db | 3 | 18 | writingtasks, writingsubmissions, writingprompts |
| ielts_listening_db | 3 | 112 | listeningtests, listeningattempts, audiofiles |
| ielts_speaking_db | 2 | 12 | speakingprompts, speakingsubmissions |
| ielts_billing_db | 5 | 13 | plans, features, pricing, discounts, auditlogs |
| ielts_payment_db | 2 | 26 | payments, transactions |
| ielts_notification_db | 3 | 45 | notifications, templates, preferences |
| ielts_exam_db | 3 | 11 | exams, examattempts, examsections |
| ielts_lesson_db | 1 | 6 | lessons |
| ielts_media_db | 0 | 0 | filesystem-based (không dùng MongoDB documents) |

---

*Chi tiết API đầy đủ (151 endpoints): [api-specification.md](api-specification.md)*  
*Chi tiết Schema đầy đủ (11 databases): [database-schema.md](database-schema.md)*  
*Ngày tạo: 2026-05-18*
