# Đặc tả API — IELTS-Mate Platform (151 Endpoints)

> **Base URL (production):** `http://localhost:3000/api`  
> **Auth Header:** `Authorization: Bearer <JWT>`  
> **Content-Type:** `application/json; charset=utf-8`  
> **Ngày:** 2026-05-18

---

## 1. Auth Service (Port 3001) — 8 Endpoints

### 1.1 POST /auth/register — Đăng ký tài khoản

**Auth:** Không yêu cầu | **Role:** Public

**Request Body:**
```json
{
  "email": "student@example.com",     // required, unique
  "password": "password123",          // required, min 6 ký tự
  "name": "Trần Văn B"               // required
}
```

**Response 201 Created:**
```json
{
  "token": "<JWT>",
  "user": { "_id": "...", "email": "...", "name": "...", "role": "Student", "plan": "FREE" }
}
```

**Errors:** `400` email tồn tại | `400` validation failed | `500` server error

---

### 1.2 POST /auth/login — Đăng nhập

**Request Body:**
```json
{ "email": "student@example.com", "password": "password123" }
```

**Response 200:**
```json
{
  "token": "<JWT expires 7d>",
  "refreshToken": "<refresh token>",
  "user": { "_id": "...", "email": "...", "role": "Student", "plan": "FREE" }
}
```

**Errors:** `401` credentials sai | `403` isActive=false | `400` validation

---

### 1.3 GET /auth/profile — Lấy thông tin cá nhân

**Auth:** Required | **Response 200:**
```json
{
  "_id": "...", "email": "...", "name": "...", "role": "Student",
  "plan": "FREE", "subscriptionPlan": "Free",
  "vipValidUntil": null, "avatar": null, "isActive": true
}
```

---

### 1.4 PUT /auth/profile — Cập nhật thông tin

**Request Body:** `{ "name": "Tên mới", "avatar": "https://cdn.example.com/avatar.jpg" }`  
**Response 200:** User object cập nhật

---

### 1.5 PUT /auth/change-password — Đổi mật khẩu

**Request Body:**
```json
{ "currentPassword": "oldPass123", "newPassword": "newPass456" }
```

**Response 200:** `{ "message": "Đổi mật khẩu thành công" }`  
**Errors:** `400` currentPassword sai | `400` newPassword < 6 ký tự

---

### 1.6 PUT /auth/update-role/:id — Cập nhật role (Admin)

**Auth:** Required | **Role:** Admin  
**Request Body:** `{ "role": "Teacher" }`  
**Response 200:** User object với role mới

---

### 1.7 PATCH /auth/internal/users/:id/subscription — Internal subscription update

**Header:** `X-Internal-Secret: <shared_secret>` (không qua user JWT)  
**Request Body:**
```json
{
  "plan": "PRO",
  "subscriptionPlan": "Pro",
  "vipValidUntil": "2027-05-18T00:00:00.000Z"
}
```
**Response 200:** `{ "message": "Subscription updated" }`

---

### 1.8 GET /health — Health Check

**Response 200:** `{ "status": "ok", "service": "auth-service", "timestamp": "2026-05-18T10:00:00Z" }`

---

## 2. Reading Service (Port 3002) — 11 Endpoints

### 2.1 GET /reading-tests — Danh sách đề thi

**Query params:** `?page=1&limit=10&search=keyword`  
**Response 200:**
```json
{
  "tests": [{ "_id": "...", "title": "Cambridge IELTS 17 Test 1", "totalQuestions": 40, "isPublished": true }],
  "total": 5, "page": 1, "limit": 10
}
```

---

### 2.2 GET /reading-tests/:id — Chi tiết đề thi

**Response 200:** Full test object với passages[], questions[], correctAnswers (nếu Teacher/Admin)

---

### 2.3 POST /reading-tests — Tạo đề thi mới

**Auth:** Required | **Role:** Teacher/Admin

**Request Body:**
```json
{
  "title": "Cambridge IELTS 17 Test 2 Reading",
  "description": "Academic Reading test from Cambridge IELTS 17",
  "passages": [
    {
      "passageNumber": 1,
      "title": "The Industrial Revolution in Britain",
      "content": "The Industrial Revolution, which began in Britain in the late 18th century...",
      "questions": [
        {
          "questionNumber": 1,
          "questionText": "The writer suggests that the Industrial Revolution was primarily caused by",
          "type": "MULTIPLE_CHOICE",
          "options": ["lack of agricultural land", "surplus of cheap labour", "technological innovation", "access to coal deposits"],
          "correctAnswer": "C",
          "points": 1
        },
        {
          "questionNumber": 2,
          "questionText": "Steam power replaced most forms of manual labour by 1850.",
          "type": "TFNG",
          "correctAnswer": "FALSE",
          "points": 1
        }
      ]
    }
  ],
  "totalQuestions": 40,
  "timeLimit": 60
}
```

**Response 201:** Test object với `_id`, `createdBy`, `isPublished: false`

---

### 2.4 PUT /reading-tests/:id — Cập nhật đề thi

**Auth:** Required | **Role:** Teacher/Admin  
**Request Body:** Partial test object (chỉ fields cần update)  
**Response 200:** Updated test object

---

### 2.5 DELETE /reading-tests/:id — Xóa đề thi

**Auth:** Required | **Role:** Admin  
**Response 200:** `{ "message": "Đề thi đã được xóa" }`

---

### 2.6 PATCH /reading-tests/:id/publish — Publish/Unpublish

**Auth:** Required | **Role:** Teacher/Admin  
**Request Body:** `{ "isPublished": true }`  
**Response 200:** `{ "_id": "...", "isPublished": true }`

---

### 2.7 POST /reading-tests/:id/submit — Nộp bài

**Auth:** Required | **Role:** Student  
**Request Body:**
```json
{
  "answers": [
    { "questionId": "q1", "answer": "C" },
    { "questionId": "q2", "answer": "FALSE" },
    { "questionId": "q3", "answer": "steam power" }
  ],
  "timeSpent": 3420
}
```
**Response 200:** Attempt object với `rawScore`, `bandScore`, `details[]`

---

### 2.8 GET /reading-attempts/my — Lịch sử của tôi

**Auth:** Required | **Role:** Student  
**Query:** `?page=1&limit=10`  
**Response 200:** Paginated attempts array với `testTitle`, `bandScore`, `createdAt`

---

### 2.9 GET /reading-attempts/:id — Chi tiết attempt

**Auth:** Required | **Response 200:** Full attempt với answer details

---

### 2.10 GET /reading-attempts/test/:testId — Attempts theo test

**Auth:** Required | **Role:** Teacher/Admin  
**Response 200:** All student attempts for the test

---

### 2.11 GET /reading-tests/:id/stats — Thống kê

**Auth:** Required | **Role:** Teacher/Admin  
**Response 200:**
```json
{
  "testId": "...", "title": "...",
  "totalAttempts": 45,
  "averageBand": 6.2,
  "bandDistribution": { "5.0": 8, "5.5": 12, "6.0": 15, "6.5": 7, "7.0": 3 },
  "averageTimeSpent": 3180,
  "hardestQuestion": { "questionId": "q28", "errorRate": 0.78 }
}
```

---

## 3. Writing Service (Port 3003) — 10 Endpoints

### 3.1 GET /writing-tasks — Danh sách prompts

**Response 200:** `[{ "_id": "...", "title": "...", "taskType": "TASK_2", "topic": "Environment" }]`

### 3.2 GET /writing-tasks/:id — Chi tiết prompt

### 3.3 POST /writing-tasks — Tạo prompt (Teacher/Admin)

**Request Body:**
```json
{
  "title": "The advantages and disadvantages of remote work",
  "taskType": "TASK_2",
  "prompt": "Some people believe that working from home has more advantages than disadvantages for both employees and employers. To what extent do you agree or disagree?",
  "minWords": 250,
  "topic": "Work & Technology"
}
```

### 3.4 PUT /writing-tasks/:id — Cập nhật prompt (Teacher/Admin)

### 3.5 POST /writing-submissions — Nộp bài

**Auth:** Student | Kết quả: `202 Accepted + submissionId` — job gửi RabbitMQ

### 3.6 GET /writing-submissions/:id — Lấy kết quả

**Response 200 (đã chấm):**
```json
{
  "status": "graded",
  "grading": { "TR": 7.0, "CC": 6.5, "LR": 7.0, "GRA": 6.5, "bandScore": 7.0, "feedback": "..." }
}
```

### 3.7 GET /writing-submissions/my — Lịch sử nộp bài (Student)

### 3.8 PUT /writing-submissions/:id/grade — Override AI grade (Teacher/Admin)

**Request Body:**
```json
{ "TR": 7.5, "CC": 7.0, "LR": 7.5, "GRA": 7.0, "teacherComment": "Better than AI assessed..." }
```

### 3.9 GET /writing-submissions/task/:taskId — Submissions theo task (Teacher/Admin)

### 3.10 GET /health

---

## 4. Listening Service (Port 3004) — 9 Endpoints

| # | Method | Path | Auth | Role | Mô tả |
|---|---|---|---|---|---|
| 1 | GET | /listening-tests | ❌ | — | Danh sách |
| 2 | GET | /listening-tests/:id | ❌ | — | Chi tiết |
| 3 | POST | /listening-tests | ✅ | Teacher/Admin | Tạo mới (với audio URL) |
| 4 | PUT | /listening-tests/:id | ✅ | Teacher/Admin | Cập nhật |
| 5 | DELETE | /listening-tests/:id | ✅ | Admin | Xóa |
| 6 | POST | /listening-tests/:id/submit | ✅ | Student | Nộp bài, nhận band score |
| 7 | GET | /listening-attempts/my | ✅ | Student | Lịch sử |
| 8 | GET | /listening-attempts/test/:testId | ✅ | Teacher/Admin | Tất cả attempts |
| 9 | GET | /health | ❌ | — | Health check |

---

## 5. Speaking Service (Port 3005) — 7 Endpoints

| # | Method | Path | Auth | Role | Mô tả |
|---|---|---|---|---|---|
| 1 | GET | /speaking-prompts | ❌ | — | Danh sách prompts |
| 2 | POST | /speaking-prompts | ✅ | Teacher/Admin | Tạo prompt |
| 3 | POST | /speaking-submissions | ✅ | Student | Upload recording → RabbitMQ |
| 4 | GET | /speaking-submissions/:id | ✅ | Any | Kết quả scoring |
| 5 | GET | /speaking-submissions/my | ✅ | Student | Lịch sử |
| 6 | PUT | /speaking-submissions/:id/grade | ✅ | Teacher/Admin | Override score |
| 7 | GET | /health | ❌ | — | Health check |

**AI Scoring Criteria (0–9 mỗi tiêu chí):**
- **Fluency & Coherence** — độ trôi chảy, mạch lạc
- **Lexical Resource** — vốn từ, độ chính xác
- **Grammatical Range** — đa dạng cấu trúc, ít lỗi
- **Pronunciation** — phát âm, ngữ điệu

---

## 6. Billing Service (Port 3007) — 5 Endpoints

| # | Method | Path | Auth | Role | Mô tả |
|---|---|---|---|---|---|
| 1 | GET | /billing/plans | ❌ | — | Danh sách gói (active) |
| 2 | GET | /billing/plans/:id | ❌ | — | Chi tiết gói |
| 3 | POST | /billing/plans | ✅ | Admin | Tạo gói mới |
| 4 | PUT | /billing/plans/:id | ✅ | Admin | Cập nhật gói |
| 5 | DELETE | /billing/plans/:id | ✅ | Admin | Xóa/deactivate gói |

**Response GET /billing/plans:**
```json
[
  { "code": "FREE", "name": "Miễn phí", "price": 0, "durationMonths": 0, "features": ["Reading cơ bản"] },
  { "code": "PLUS", "name": "Plus", "price": 599000, "durationMonths": 12, "features": ["Reading", "Listening", "Writing"] },
  { "code": "PRO", "name": "Pro", "price": 999000, "durationMonths": 12, "features": ["Reading", "Listening", "Writing", "Speaking", "Full Mock Test"] }
]
```

---

## 7. Payment Service (Port 3008) — 7 Endpoints

| # | Method | Path | Auth | Mô tả |
|---|---|---|---|---|
| 1 | POST | /payment/create | ✅ | Tạo payment intent, nhận paymentUrl |
| 2 | POST | /payment/webhook | Internal | Gateway gửi webhook từ payment provider |
| 3 | GET | /payment/history/my | ✅ | Lịch sử thanh toán của tôi |
| 4 | GET | /payment/transactions | ✅ Admin | Tất cả giao dịch |
| 5 | GET | /payment/:id | ✅ | Chi tiết một giao dịch |
| 6 | POST | /payment/refund/:id | ✅ Admin | Hoàn tiền |
| 7 | GET | /health | — | Health check |

---

## 8. Notification Service (Port 3009) — 5 Endpoints

| # | Method | Path | Auth | Mô tả |
|---|---|---|---|---|
| 1 | GET | /notifications | ✅ | Thông báo của tôi (paginated) |
| 2 | GET | /notifications/unread-count | ✅ | Số thông báo chưa đọc |
| 3 | PATCH | /notifications/:id/read | ✅ | Đánh dấu đã đọc |
| 4 | PATCH | /notifications/read-all | ✅ | Đánh dấu tất cả đã đọc |
| 5 | GET | /health | — | Health check |

---

## 9. Cloud Media Service (Port 3010) — 5 Endpoints

| # | Method | Path | Auth | Mô tả |
|---|---|---|---|---|
| 1 | POST | /media/upload | ✅ | Upload file (multipart/form-data) |
| 2 | GET | /media/files | ✅ Admin | Danh sách files |
| 3 | GET | /media/files/:id | ✅ | Chi tiết file |
| 4 | DELETE | /media/files/:id | ✅ Admin | Xóa file |
| 5 | GET | /health | — | Health check |

**Upload Request (multipart):**
- Field: `file` (audio: MP3/WAV ≤ 50MB, video: WebM/MP4 ≤ 100MB, image: JPEG/PNG ≤ 10MB)
- **Response 201:** `{ "fileId": "...", "url": "https://cdn.example.com/...", "mimeType": "audio/mpeg", "size": 4320000 }`

---

## 10. AI Service (Port 8000) — FastAPI Endpoints

| Method | Path | Mô tả |
|---|---|---|
| POST | /grade/writing | Chấm điểm Writing (Gemini) |
| POST | /grade/speaking | Chấm điểm Speaking (Gemini + transcript) |
| POST | /ocr/extract | OCR từ ảnh bài viết tay (PaddleOCR) |
| GET | /health | Health check |

**POST /grade/writing — Request:**
```json
{
  "taskType": "TASK_2",
  "content": "In many countries...",
  "prompt": "Some people think..."
}
```

**POST /grade/writing — Response:**
```json
{
  "TR": 7.0, "CC": 6.5, "LR": 7.0, "GRA": 6.5,
  "bandScore": 7.0,
  "feedback": "...",
  "suggestions": ["...", "..."]
}
```

---

*Tổng cộng: 77 REST endpoints + 4 FastAPI endpoints · Ngày: 2026-05-18*
