# Ma trận xác nhận — Validation Matrix

> **Mục đích:** Truy vết đầy đủ các ràng buộc dữ liệu quan trọng, quy tắc nghiệp vụ và bộ test case tương ứng.  
> **Format:** Mỗi hàng liên kết 1 ràng buộc với test file + test ID cụ thể.  
> **Ngày:** 2026-05-18

---

## Phần 1 — Auth Service

### 1.1 Đăng ký & Đăng nhập

| ID | Ràng buộc | Loại | Rule | Test File | Test ID | Kết quả |
|---|---|---|---|---|---|---|
| VAL-AUTH-01 | Email phải unique | Schema | MongoDB unique index trên `email` | `auth.schema.test.js` | US-AUTH-15 | ✅ PASS |
| VAL-AUTH-02 | Email format hợp lệ | Business | Regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` | `auth.unit.test.js` | US-AUTH-01 | ✅ PASS |
| VAL-AUTH-03 | Password ≥ 6 ký tự | Business | Validation trước khi hash | `auth.unit.test.js` | US-AUTH-02 | ✅ PASS |
| VAL-AUTH-04 | Password bcrypt hash | Security | `bcrypt.hash(password, 12)` — không lưu plain | `auth.unit.test.js` | US-AUTH-04 | ✅ PASS |
| VAL-AUTH-05 | JWT payload chuẩn | Security | Payload: `{ id, role, plan, iat, exp }` | `auth.unit.test.js` | US-AUTH-08 | ✅ PASS |
| VAL-AUTH-06 | JWT hết hạn sau 7 ngày | Security | `exp = iat + 604800` (giây) | `auth.unit.test.js` | US-AUTH-08 | ✅ PASS |
| VAL-AUTH-07 | Tài khoản bị khóa từ chối | Business | `isActive: false` → 403 Forbidden | `auth.api.test.js` | US-AUTH-12 | ✅ PASS |
| VAL-AUTH-08 | Role enum hợp lệ | Schema | ∈ {Admin, Teacher, Student} | `auth.schema.test.js` | US-AUTH-16 | ✅ PASS |
| VAL-AUTH-09 | Plan enum hợp lệ | Schema | ∈ {FREE, PLUS, PRO} | `auth.schema.test.js` | US-AUTH-16 | ✅ PASS |
| VAL-AUTH-10 | Cập nhật subscription từ payment | Integration | PATCH /internal/users/:id/subscription yêu cầu `X-Internal-Secret` | `auth.api.test.js` | US-AUTH-13 | ✅ PASS |

---

## Phần 2 — Reading Service

### 2.1 Tạo và cấu trúc đề thi

| ID | Ràng buộc | Loại | Rule | Test File | Test ID | Kết quả |
|---|---|---|---|---|---|---|
| VAL-READ-01 | Chỉ Teacher/Admin tạo đề | RBAC | Middleware `requireRole(["Teacher","Admin"])` | `reading.api.test.js` | US-READ-01 | ✅ PASS |
| VAL-READ-02 | Question type enum | Schema | ∈ {MULTIPLE_CHOICE, FILL_IN_BLANK, MATCHING, TFNG, YNNG} | `reading.schema.test.js` | US-READ-17 | ✅ PASS |
| VAL-READ-03 | TFNG correctAnswer enum | Schema | ∈ {TRUE, FALSE, NOT_GIVEN} | `reading.schema.test.js` | US-READ-17 | ✅ PASS |
| VAL-READ-04 | YNNG correctAnswer enum | Schema | ∈ {YES, NO, NOT_GIVEN} | `reading.schema.test.js` | US-READ-17 | ✅ PASS |
| VAL-READ-05 | MULTIPLE_CHOICE có options[] | Business | options array bắt buộc nếu type = MULTIPLE_CHOICE | `reading.unit.test.js` | US-READ-06 | ✅ PASS |

### 2.2 Chấm điểm và Band Score

| ID | Ràng buộc | Loại | Rule | Test File | Test ID | Kết quả |
|---|---|---|---|---|---|---|
| VAL-READ-06 | normalizeAnswer lowercase | Business | `answer.trim().toLowerCase().replace(/\s+/g,' ')` | `reading.unit.test.js` | US-READ-08 | ✅ PASS |
| VAL-READ-07 | Band score 1.0–9.0 | Business | Clamp: `Math.min(Math.max(band, 1.0), 9.0)` | `reading.unit.test.js` | US-READ-09 | ✅ PASS |
| VAL-READ-08 | 39/40 → band 9.0 | Acceptance | IELTS Cambridge lookup table | `reading.unit.test.js` | US-READ-09 | ✅ PASS |
| VAL-READ-09 | 30/40 → band 7.0 | Acceptance | IELTS Cambridge lookup table | `reading.unit.test.js` | US-READ-10 | ✅ PASS |
| VAL-READ-10 | Attempt lưu đủ fields | Schema | studentId, testId, rawScore, bandScore, answers[], timeSpent | `reading.schema.test.js` | US-READ-18 | ✅ PASS |
| VAL-READ-11 | Band score regression | Regression | Các ngưỡng biên không bị thay đổi sau refactor | `reading.regression.test.js` | RG-READ-01 | ✅ PASS |

---

## Phần 3 — Listening Service

### 3.1 Cấu trúc Test & Chấm điểm

| ID | Ràng buộc | Loại | Rule | Test File | Test ID | Kết quả |
|---|---|---|---|---|---|---|
| VAL-LIST-01 | Question type enum | Schema | ∈ {multiple_choice, fill_blank, map_labeling, matching} | `listening.schema.test.js` | US-LIST-17 | ✅ PASS |
| VAL-LIST-02 | Dictation case-insensitive | Business | `normalize(studentAns) === normalize(correctAns)` | `listening.unit.test.js` | US-LIST-09 | ✅ PASS |
| VAL-LIST-03 | Dictation whitespace collapse | Business | `/\s+/g → ' '` trước khi so sánh | `listening.unit.test.js` | US-LIST-09 | ✅ PASS |
| VAL-LIST-04 | Attempt lưu per-part scores | Schema | `parts[].partScore`, `parts[].answers[]` | `listening.schema.test.js` | US-LIST-18 | ✅ PASS |
| VAL-LIST-05 | Band score 1.0–9.0 | Business | Lookup table chuẩn IELTS | `listening.unit.test.js` | US-LIST-10 | ✅ PASS |

---

## Phần 4 — Writing Service

### 4.1 Submission & AI Grading Contract

| ID | Ràng buộc | Loại | Rule | Test File | Test ID | Kết quả |
|---|---|---|---|---|---|---|
| VAL-WRIT-01 | Task type enum | Schema | ∈ {TASK_1, TASK_2} | `writing.schema.test.js` | US-WRIT-18 | ✅ PASS |
| VAL-WRIT-02 | Status flow hợp lệ | Business | pending → grading → graded/failed | `writing.schema.test.js` | US-WRIT-18 | ✅ PASS |
| VAL-WRIT-03 | Criteria TR/CC/LR/GRA range | Schema | min: 0, max: 9, step: 0.5 | `writing.schema.test.js` | US-WRIT-18 | ✅ PASS |
| VAL-WRIT-04 | bandScore = avg(TR,CC,LR,GRA) | Business | Tính trung bình, làm tròn 0.5 | `writing.unit.test.js` | US-WRIT-10 | ✅ PASS |
| VAL-WRIT-05 | Band score clamp | Business | Gemini đôi khi trả >9 → clamp | `writing.regression.test.js` | RG-WRIT-01 | ✅ PASS |
| VAL-WRIT-06 | RabbitMQ message schema | Integration | submissionId + taskType + content bắt buộc | `writing.unit.test.js` | US-WRIT-11 | ✅ PASS |
| VAL-WRIT-07 | Teacher override lưu | Business | overriddenBy, teacherComment lưu vào DB | `writing.api.test.js` | US-WRIT-06 | ✅ PASS |
| VAL-WRIT-08 | Student không override | RBAC | role = Student → 403 | `writing.api.test.js` | US-WRIT-07 | ✅ PASS |
| VAL-WRIT-09 | Bài viết quá ngắn | Business | wordCount < 50 → 400 Bad Request | `writing.api.test.js` | US-WRIT-03 | ✅ PASS |

---

## Phần 5 — Speaking Service

| ID | Ràng buộc | Loại | Rule | Test File | Test ID | Kết quả |
|---|---|---|---|---|---|---|
| VAL-SPEAK-01 | Recording upload MIME check | Business | ∈ {audio/webm, audio/mp4, video/webm} | `speaking.api.test.js` | US-SPEAK-03 | ✅ PASS |
| VAL-SPEAK-02 | Criteria Fluency/Vocab/Grammar/Pron | Schema | 4 tiêu chí, mỗi cái 0–9 | `speaking.schema.test.js` | US-SPEAK-18 | ✅ PASS |
| VAL-SPEAK-03 | Status flow như Writing | Business | pending → graded/failed | `speaking.schema.test.js` | US-SPEAK-18 | ✅ PASS |

---

## Phần 6 — Billing & Payment

| ID | Ràng buộc | Loại | Rule | Test File | Test ID | Kết quả |
|---|---|---|---|---|---|---|
| VAL-BILL-01 | Plan code unique | Schema | unique index trên Plan.code | `billing.schema.test.js` | US-BILL-11 | ✅ PASS |
| VAL-BILL-02 | Plan code enum chính | Business | ∈ {FREE, PLUS, PRO} cho 3 gói cơ bản | `billing.unit.test.js` | US-BILL-03 | ✅ PASS |
| VAL-PAY-01 | HMAC webhook signature | Security | HMAC-SHA256 với shared secret | `payment.unit.test.js` | US-PAY-07 | ✅ PASS |
| VAL-PAY-02 | Idempotent webhook | Business | Cùng paymentId không xử lý lại | `payment.regression.test.js` | RG-PAY-02 | ✅ PASS |
| VAL-PAY-03 | Subscription update sau payment | Integration | PATCH auth-service /internal | `payment.e2e.test.js` | E2E-PAY-01 | ✅ PASS |

---

## Phần 7 — Cloud Media Service

| ID | Ràng buộc | Loại | Rule | Test File | Test ID | Kết quả |
|---|---|---|---|---|---|---|
| VAL-MEDIA-01 | MIME type allowlist | Security | ∈ {audio/mpeg, audio/wav, video/webm, image/jpeg, image/png} | `cloudmedia.unit.test.js` | US-MEDIA-06 | ✅ PASS |
| VAL-MEDIA-02 | File size limit | Business | ≤ 50MB audio, ≤ 100MB video | `cloudmedia.unit.test.js` | US-MEDIA-07 | ✅ PASS |
| VAL-MEDIA-03 | CDN URL không expose server path | Security | URL là CDN permalink, không phải filesystem path | `cloudmedia.api.test.js` | US-MEDIA-04 | ✅ PASS |

---

## Tổng hợp

| Service | Ràng buộc đã xác minh | PASS | FAIL |
|---|---|---|---|
| auth-service | 10 | 10 | 0 |
| reading-service | 11 | 11 | 0 |
| listening-service | 5 | 5 | 0 |
| writing-service | 9 | 9 | 0 |
| speaking-service | 3 | 3 | 0 |
| billing-service | 2 | 2 | 0 |
| payment-service | 3 | 3 | 0 |
| cloud-media-service | 3 | 3 | 0 |
| **Tổng** | **46** | **46** | **0** |

---

*Tất cả 46 ràng buộc đã được xác minh và vượt qua. Ngày kiểm tra: 2026-05-18.*
