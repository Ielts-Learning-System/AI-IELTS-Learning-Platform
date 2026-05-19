# PHỤ LỤC C — Mô hình dữ liệu, Ràng buộc toàn vẹn và Ma trận xác nhận

> **Dự án:** IELTS-Mate Platform  
> **Loại tài liệu:** Data Model Contracts + Cross-Service Validation Matrix  
> **Phiên bản:** 1.0 — 2026-05-18

---

## C.1 Tổng quan kiến trúc dữ liệu

IELTS-Mate áp dụng **Database-per-Service** pattern: mỗi microservice sở hữu MongoDB database riêng biệt. Không có service nào đọc trực tiếp database của service khác. Trao đổi dữ liệu qua:

1. **REST (đồng bộ):** Qua API Gateway cho các yêu cầu từ client hoặc internal HTTP calls (auth proxy)
2. **RabbitMQ AMQP (bất đồng bộ):** Cho AI grading, notification, analytics — không block HTTP

```
Auth DB ◄──── auth-service ◄─── API Gateway ◄─── React SPA
                  ↑ internal HTTP
Payment DB ◄── payment-service ──────────────────┘

RabbitMQ: writing-service → [queue: grading] → ai-service → writing-service callback
```

---

## C.2 Ràng buộc Enum toàn hệ thống

Các enum này phải **nhất quán tuyệt đối** giữa tất cả service liên quan:

### C.2.1 User Role

| Giá trị | Service sử dụng | Ý nghĩa |
|---|---|---|
| `Admin` | auth, api-gateway, tất cả service | Toàn quyền |
| `Teacher` | auth, reading, listening, writing, speaking, exam | Tạo/sửa đề thi, xem tất cả kết quả |
| `Student` | auth, tất cả service | Làm bài, xem kết quả của mình |

**Nguồn chân lý:** `auth-service/src/models/User.js` — `role: { type: String, enum: ["Admin", "Teacher", "Student"] }`

### C.2.2 Subscription Plan

| Giá trị (DB) | Hiển thị | Service kiểm tra | Quyền lợi |
|---|---|---|---|
| `FREE` | Miễn phí | auth, api-gateway | Reading cơ bản (tối đa 5 bài/tháng) |
| `PLUS` | Plus | auth, api-gateway, billing | Reading + Listening + Writing (50 giờ/tháng) |
| `PRO` | Pro | auth, api-gateway, billing | 4 kỹ năng + Full Mock Test không giới hạn |

**Lưu ý:** `auth-service/User.js` có hai trường song song:
- `plan: enum ["FREE", "PLUS", "PRO"]` — dùng cho gate check tại middleware  
- `subscriptionPlan: enum ["Free", "Plus", "Pro"]` — dùng cho hiển thị UI  

⚠️ **Rủi ro không đồng bộ:** Phải cập nhật đồng thời cả hai trường khi thay đổi subscription.

### C.2.3 Band Score

| Range | Bước tăng | Service | Validation |
|---|---|---|---|
| 1.0 → 9.0 | 0.5 | reading, listening, writing, speaking, exam | `bandScore: { min: 1, max: 9 }` + clamp trước khi lưu |

**Clamp rule:** Gemini API đôi khi trả 9.5 hoặc 0; phải clamp: `Math.min(Math.max(score, 1.0), 9.0)`

### C.2.4 Writing Submission Status

| Giá trị | Mô tả | Transition |
|---|---|---|
| `pending` | Mới nộp, chờ AI | POST → pending |
| `grading` | AI đang xử lý | RabbitMQ consumer nhận |
| `graded` | AI chấm xong | consumer callback |
| `failed` | AI lỗi | consumer error handler |
| `teacher_reviewed` | Teacher override | Teacher PUT |

---

## C.3 Ràng buộc Cross-Service

### C.3.1 Auth ↔ Payment — Cập nhật Subscription

**Luồng:**
1. Payment webhook nhận từ gateway: `POST /payment/webhook`
2. payment-service xác minh HMAC signature
3. Gọi nội bộ: `PATCH auth-service:3001/internal/users/:id/subscription`
4. Body: `{ "plan": "PRO", "subscriptionPlan": "Pro", "vipValidUntil": "2027-05-18T00:00:00Z" }`
5. auth-service kiểm tra `X-Internal-Secret` header trước khi cập nhật

**Ràng buộc:**
- Idempotent: cùng `paymentId` không được xử lý 2 lần
- `vipValidUntil` phải là ISO 8601 UTC
- Nếu payment-service không liên lạc được auth-service: lưu event vào retry queue

### C.3.2 Writing ↔ AI Service — RabbitMQ Contract

**Message gửi lên queue `writing.grading`:**

```json
{
  "submissionId": "507f1f77bcf86cd799439011",
  "taskType": "TASK_2",
  "content": "In many countries, the government provides free higher education...",
  "wordCount": 312,
  "prompt": "Some people think universities should focus on practical skills..."
}
```

**Message callback (ai-service → writing-service):**

```json
{
  "submissionId": "507f1f77bcf86cd799439011",
  "status": "graded",
  "grading": {
    "TR": 7.0,
    "CC": 6.5,
    "LR": 7.0,
    "GRA": 6.5,
    "bandScore": 6.75,
    "feedback": "Good task response but coherence could be improved...",
    "suggestions": ["Use more varied sentence structures", "Develop topic sentences"]
  }
}
```

**Ràng buộc schema (Pydantic v2 validation):**
- `TR`, `CC`, `LR`, `GRA`: `float`, range `[1.0, 9.0]`, bước 0.5
- `bandScore` = trung bình 4 tiêu chí, làm tròn tới 0.5 gần nhất
- `feedback`: string ≤ 2000 ký tự
- `suggestions`: array string, tối đa 5 phần tử

### C.3.3 Notification — Event Schema

**Queue `notification.events`:**

```json
{
  "type": "GRADING_COMPLETE",
  "userId": "507f1f77bcf86cd799439011",
  "data": {
    "skill": "writing",
    "submissionId": "abc123",
    "bandScore": 6.5,
    "timestamp": "2026-05-18T10:30:00Z"
  }
}
```

**Supported types:** `GRADING_COMPLETE`, `PAYMENT_SUCCESS`, `PAYMENT_FAILED`, `SUBSCRIPTION_ACTIVATED`, `SUBSCRIPTION_EXPIRED`

---

## C.4 Ma trận xác nhận tính toàn vẹn dữ liệu

Chi tiết test cases: [validation-matrix.md](validation-matrix.md)

| # | Ràng buộc | Service | Trường | Rule | Được kiểm tra bởi |
|---|---|---|---|---|---|
| 1 | Email duy nhất | auth | `User.email` | unique index | Schema test US-AUTH-15 |
| 2 | Password bcrypt | auth | `User.password` | bcrypt hash, không lưu plain | Unit test US-AUTH-04 |
| 3 | Role enum hợp lệ | auth | `User.role` | ∈ {Admin, Teacher, Student} | Schema test US-AUTH-16 |
| 4 | Plan enum hợp lệ | auth | `User.plan` | ∈ {FREE, PLUS, PRO} | Schema test US-AUTH-16 |
| 5 | JWT 7 ngày | auth | token payload | exp = iat + 604800 | Unit test US-AUTH-08 |
| 6 | Band score range | reading | `Attempt.bandScore` | 1.0 ≤ x ≤ 9.0 | Regression test RG-READ-01 |
| 7 | normalizeAnswer | reading | answer matching | lowercase+trim+collapse | Unit test US-READ-08 |
| 8 | TFNG enum | reading | `Question.correctAnswer` | ∈ {TRUE, FALSE, NOT_GIVEN} | Schema test US-READ-17 |
| 9 | Writing criteria 0–9 | writing | `grading.TR/CC/LR/GRA` | 0 ≤ x ≤ 9, step 0.5 | Schema test US-WRIT-18 |
| 10 | Submission status flow | writing | `submission.status` | pending→grading→graded | E2E test E2E-WRIT-01 |
| 11 | Dictation case-insensitive | listening | answer comparison | toLowerCase().trim() | Unit test US-LIST-09 |
| 12 | Question type enum | listening | `Question.type` | ∈ {multiple_choice, fill_blank, map_labeling, matching} | Schema test US-LIST-17 |
| 13 | Plan code unique | billing | `Plan.code` | unique index | Schema test US-BILL-11 |
| 14 | Payment idempotent | payment | `paymentId` | không xử lý lại | Regression test RG-PAY-02 |
| 15 | Webhook HMAC | payment | `X-Webhook-Signature` | HMAC-SHA256 verify | Unit test US-PAY-07 |
| 16 | Media MIME type | cloud-media | uploaded file | ∈ {audio/mpeg, audio/wav, video/webm, image/jpeg, image/png} | Unit test US-MEDIA-06 |

---

## C.5 Chiến lược Index MongoDB

| Service | Collection | Index | Lý do |
|---|---|---|---|
| auth | users | `{ email: 1 }` unique | Login query |
| auth | users | `{ role: 1, isActive: 1 }` | Admin user list filter |
| reading | readingtests | `{ createdBy: 1, isPublished: 1 }` | Teacher dashboard |
| reading | readingattempts | `{ studentId: 1, testId: 1 }` | Student history |
| reading | readingattempts | `{ testId: 1, createdAt: -1 }` | Stats aggregation |
| writing | writingsubmissions | `{ studentId: 1, createdAt: -1 }` | Student history paginated |
| writing | writingsubmissions | `{ status: 1 }` | Grading queue monitor |
| listening | listeningattempts | `{ studentId: 1, testId: 1 }` | Progress tracking |
| billing | plans | `{ code: 1 }` unique | Plan lookup by code |
| payment | payments | `{ userId: 1, createdAt: -1 }` | Payment history |
| notification | notifications | `{ userId: 1, isRead: 1 }` | Unread notifications |

---

## C.6 Bảng chuyển đổi Band Score — Reading & Listening

Nguồn: Cambridge IELTS Official Conversion Table

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
| 0–3 | 1.0–2.0 |

---

*Ngày tạo: 2026-05-18 | Nguồn: source code thực tế + IELTS Cambridge official documentation*
