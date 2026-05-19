# User Stories & Acceptance Criteria — IELTS-Mate Platform

> **Tài liệu này** trình bày chi tiết Acceptance Criteria (AC) cho các User Story ưu tiên cao (CRITICAL/HIGH) của từng Epic.  
> **Format:** GIVEN–WHEN–THEN (BDD style)  
> **Ngày cập nhật:** 2026-05-18

---

## Sprint 0 — Frontend Foundation

### E0-US01: Định nghĩa kiến trúc Frontend

**As a** Frontend Lead,  
**I want to** define the frontend architecture baseline,  
**So that** all later service integrations follow a consistent and scalable structure.

**Acceptance Criteria:**

| # | Kịch bản | GIVEN | WHEN | THEN |
|---|---|---|---|---|
| AC1 | Stack khởi tạo | Dự án chưa tồn tại | Developer chạy `npm create vite@latest` với template react-ts | Project được khởi tạo với TypeScript strict mode, Tailwind CSS v3, ESLint |
| AC2 | Zustand stores | App được khởi tạo | Developer import `authStore` | Store cung cấp `user`, `token`, `login()`, `logout()`, `setUser()` actions |
| AC3 | API client | axiosClient được import | Request được gửi | Base URL từ env, auth header được tự động đính kèm, 401 tự động logout |
| AC4 | Protected routes | User chưa đăng nhập | Truy cập `/dashboard` | Redirect tới `/login` — không render nội dung protected |
| AC5 | Role-based nav | User đăng nhập với role Student | Navigation renders | Không hiển thị menu Admin, Teacher |

---

## Sprint 1 — Auth Service

### E1-US01: Đăng ký tài khoản

**As a** Guest,  
**I want to** register an account with email and password,  
**So that** I can access IELTS practice features.

| # | Kịch bản | GIVEN | WHEN | THEN |
|---|---|---|---|---|
| AC1 | Đăng ký hợp lệ | Guest cung cấp email mới + password ≥ 6 ký tự + name | POST /register | 201 Created, `{ token, user: { id, email, name, role: "Student", plan: "FREE" } }` |
| AC2 | Email trùng | Email đã tồn tại trong DB | POST /register | 400 Bad Request, `{ error: "Email đã được đăng ký" }` |
| AC3 | Mật khẩu yếu | Password < 6 ký tự | POST /register | 400 Bad Request với message validation |
| AC4 | Thiếu trường | Bỏ qua field `email` | POST /register | 400 Bad Request, validation error |
| AC5 | Mật khẩu được hash | Đăng ký thành công | Query DB | `password` field là bcrypt hash — không bao giờ lưu plaintext |

### E1-US02: Đăng nhập với JWT

| # | Kịch bản | GIVEN | WHEN | THEN |
|---|---|---|---|---|
| AC1 | Đăng nhập hợp lệ | Tài khoản tồn tại + password đúng | POST /login | 200 OK, `{ token, refreshToken, user }` — token hợp lệ 7 ngày |
| AC2 | Sai mật khẩu | Email tồn tại nhưng password sai | POST /login | 401 Unauthorized, `{ error: "Email hoặc mật khẩu không đúng" }` |
| AC3 | Email không tồn tại | Email chưa đăng ký | POST /login | 401 Unauthorized |
| AC4 | Tài khoản bị khóa | `isActive: false` | POST /login | 403 Forbidden, `{ error: "Tài khoản đã bị vô hiệu hóa" }` |

### E1-US04: RBAC — Phân quyền theo role

| # | Kịch bản | GIVEN | WHEN | THEN |
|---|---|---|---|---|
| AC1 | Student truy cập Admin route | Token role = Student | GET /admin/users | 403 Forbidden |
| AC2 | Teacher truy cập Teacher route | Token role = Teacher | POST /reading-tests | 201 Created (thành công) |
| AC3 | Token không hợp lệ | Malformed/expired JWT | GET /profile | 401 Unauthorized |
| AC4 | Admin xem tất cả | Token role = Admin | GET /admin/users | 200 OK với danh sách user |

---

## Sprint 3 — Reading Service

### E3-US01: Tạo đề thi Reading

**As a** Teacher,  
**I want to** create multi-passage reading tests with multiple question types,  
**So that** students practice all IELTS Reading formats.

| # | Kịch bản | GIVEN | WHEN | THEN |
|---|---|---|---|---|
| AC1 | Tạo test hợp lệ | Teacher đăng nhập, body gồm title + passages[].questions[] | POST /reading-tests | 201 Created, test ID trả về, `isPublished: false` mặc định |
| AC2 | Multiple choice | question.type = MULTIPLE_CHOICE, options[] = 4 phần tử | POST | Lưu thành công với correctAnswer là index 0–3 |
| AC3 | Fill in blank | question.type = FILL_IN_BLANK, correctAnswer có alternate forms | POST | normalizeAnswer() áp dụng khi chấm điểm |
| AC4 | TFNG | question.type = TFNG, correctAnswer ∈ {TRUE, FALSE, NOT_GIVEN} | POST | 201 Created |
| AC5 | Student không tạo | Token role = Student | POST /reading-tests | 403 Forbidden |

### E3-US03: Chấm điểm tự động → Band Score

| # | Kịch bản | GIVEN | WHEN | THEN |
|---|---|---|---|---|
| AC1 | 39 câu đúng | Student submit 39 đúng / 40 câu | POST /reading-tests/:id/submit | bandScore = 9.0 |
| AC2 | 30 câu đúng | Student submit 30 đúng | Submit | bandScore = 7.0 (theo IELTS Cambridge table) |
| AC3 | 0 câu đúng | Student submit tất cả sai | Submit | bandScore = 1.0 |
| AC4 | Lưu attempt | Submit thành công | Query AttemptModel | attempt lưu `studentId`, `testId`, `rawScore`, `bandScore`, `answers[]`, `timeSpent` |

---

## Sprint 4 — Listening Service

### E4-US03: Dictation với chấm điểm chính xác

| # | Kịch bản | GIVEN | WHEN | THEN |
|---|---|---|---|---|
| AC1 | Câu trả lời chính xác | Student gõ đúng từng từ | Submit | 1 điểm cho câu đó |
| AC2 | Khác hoa/thường | "The River" vs "the river" | Submit | Vẫn chấm đúng (case-insensitive) |
| AC3 | Khoảng trắng thừa | "the   river" | Submit | Vẫn đúng (collapse whitespace) |
| AC4 | Sai từ | "A river" vs đáp án "The river" | Submit | 0 điểm, `isCorrect: false` |

---

## Sprint 5 — Writing Service

### E5-US02: Nộp bài và nhận kết quả AI

| # | Kịch bản | GIVEN | WHEN | THEN |
|---|---|---|---|---|
| AC1 | Nộp Task 2 thành công | Student có token hợp lệ + content ≥ 50 từ | POST /writing-submissions | 202 Accepted, `{ submissionId, status: "pending" }` — job gửi vào RabbitMQ |
| AC2 | AI chấm xong | RabbitMQ consumer nhận job | Gemini trả kết quả | submission cập nhật `status: "graded"`, `grading.bandScore`, `grading.criteria` (TR/CC/LR/GRA) |
| AC3 | Poll status | Student gọi GET /writing-submissions/:id | Trước khi chấm xong | `{ status: "pending" }` |
| AC4 | Lấy kết quả | Student gọi GET /writing-submissions/:id | Sau khi chấm xong | `{ status: "graded", grading: { TR: 7, CC: 6.5, LR: 7, GRA: 6, bandScore: 6.5 } }` |
| AC5 | Bài quá ngắn | content < 50 từ | POST | 400 Bad Request, `{ error: "Bài viết quá ngắn" }` |

### E5-US04: Teacher override AI grade

| # | Kịch bản | GIVEN | WHEN | THEN |
|---|---|---|---|---|
| AC1 | Override hợp lệ | Teacher đăng nhập, submission đã graded | PUT /writing-submissions/:id/grade | 200 OK, grading cập nhật, `overriddenBy: teacherId`, `teacherComment` lưu |
| AC2 | Student không override | Token role = Student | PUT /writing-submissions/:id/grade | 403 Forbidden |

---

## Sprint 7 — Billing Service

### E8-US01: Quản lý Plan Catalog

| # | Kịch bản | GIVEN | WHEN | THEN |
|---|---|---|---|---|
| AC1 | List plans | Public request | GET /billing/plans | 200 OK, array 3 gói (FREE, PLUS, PRO) với price, features, duration |
| AC2 | Tạo plan mới | Admin token | POST /billing/plans | 201 Created với code unique |
| AC3 | Code trùng | Plan code đã tồn tại | POST /billing/plans | 400 Bad Request |
| AC4 | Toggle active | Admin PUT /billing/plans/:id | isActive: false | Plan bị ẩn khỏi public list |

---

## Sprint 8 — Payment Service

### E9-US03: Webhook cập nhật subscription

| # | Kịch bản | GIVEN | WHEN | THEN |
|---|---|---|---|---|
| AC1 | Thanh toán thành công | Gateway gửi webhook với `status: "SUCCESS"` | POST /payment/webhook | User's plan cập nhật qua internal API auth-service, `vipValidUntil` tăng 12 tháng |
| AC2 | Webhook signature invalid | Signature header sai | POST /payment/webhook | 401 Unauthorized, không xử lý |
| AC3 | Duplicate webhook | Payment ID đã xử lý | POST /payment/webhook | 200 OK nhưng idempotent — không cập nhật lần 2 |

---

## Sprint 10 — API Gateway

### E10-US01: Routing qua Gateway

| # | Kịch bản | GIVEN | WHEN | THEN |
|---|---|---|---|---|
| AC1 | Proxy hợp lệ | Client gửi `GET /api/reading-tests` | API Gateway | Forward tới reading-service:3002/reading-tests, trả response |
| AC2 | Service down | reading-service không khả dụng | Client request | 503 Service Unavailable, không crash gateway |
| AC3 | Rate limit | IP gửi >100 req/phút (FREE) | Next request | 429 Too Many Requests với `Retry-After` header |
| AC4 | CORS | Cross-origin request từ `https://ielts-mate.com` | Preflight OPTIONS | CORS headers đúng: `Access-Control-Allow-Origin`, `Allow-Methods` |

---

*Tổng: 51 User Stories · 205 Story Points · 100% ✅ Done · 2026-05-18*
