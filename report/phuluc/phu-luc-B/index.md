# PHỤ LỤC B — PRD, Backlog, User Stories và Sprint Tasks

> **Dự án:** IELTS-Mate Platform  
> **Loại tài liệu:** Product Requirements Document + Agile Backlog  
> **Phiên bản:** 1.0 — 2026-05-18  
> **Kiến trúc:** Microservices · Node.js 20 · React 18 · Python 3.11 (AI)

---

## B.1 Tóm tắt PRD (Product Requirements Document)

### Tầm nhìn sản phẩm

IELTS-Mate là nền tảng luyện thi IELTS toàn diện, được xây dựng theo kiến trúc microservices có thể mở rộng, cung cấp:

- **Luyện thi 4 kỹ năng** (Reading, Listening, Writing, Speaking) với đề thi chuẩn IELTS Cambridge
- **Chấm điểm tự động bằng AI** — Google Gemini API chấm Writing/Speaking; thuật toán chuẩn IELTS cho Reading/Listening
- **Quản lý đăng ký theo gói** — FREE, PLUS (599k/năm), PRO (999k/năm)
- **Dashboard phân tích tiến độ** — biểu đồ band score, lịch sử luyện tập, xu hướng cải thiện
- **Hệ thống thông báo thời gian thực** — kết quả chấm điểm, thanh toán, nhắc nhở

### Người dùng mục tiêu

| Persona | Mô tả | Quyền chính |
|---|---|---|
| **Guest** | Khách chưa đăng ký | Xem danh sách bài thi công khai, đọc thông tin gói |
| **Student (FREE)** | Học sinh tài khoản miễn phí | Làm bài Reading cơ bản, xem lịch sử của mình |
| **VIP Student (PLUS)** | Đăng ký gói Plus | Reading + Listening + Writing + lịch sử đầy đủ |
| **VIP Student (PRO)** | Đăng ký gói Pro | Toàn bộ 4 kỹ năng + Full Mock Test không giới hạn |
| **Teacher** | Giáo viên | Tạo/sửa/xóa đề thi, xem toàn bộ kết quả học sinh, chấm lại Writing |
| **Admin** | Quản trị viên | Toàn quyền hệ thống, quản lý người dùng, quản lý gói |

### Ràng buộc kỹ thuật

| Ràng buộc | Chi tiết |
|---|---|
| **Database isolation** | Mỗi service có MongoDB riêng — không truy vấn chéo database |
| **Auth** | JWT (7 ngày) + refresh token rotation — payload chứa `id`, `role`, `plan` |
| **Async AI grading** | Writing/Speaking gửi qua RabbitMQ queue, không block HTTP response |
| **Rate limiting** | Redis-based, 100 req/phút cho FREE, 500 req/phút cho PRO |
| **Logging** | Winston/Pino structured JSON — fields: `level`, `message`, `service`, `requestId`, `timestamp` |

---

## B.2 Phạm vi hệ thống — Service Registry

| Microservice | Sprint | Cổng | Database | Chức năng cốt lõi |
|---|---|---|---|---|
| `api-gateway` | 10 | 3000 | — | Proxy, rate-limit, CORS, request routing |
| `auth-service` | 1 | 3001 | `ielts_auth_db` | Đăng ký, đăng nhập, JWT, RBAC, API key quota |
| `cloud-media-service` | 2 | 3010 | `ielts_media_db` | Upload file, CDN path, presigned URL |
| `reading-service` | 3 | 3002 | `ielts_reading_db` | CRUD đề thi, auto-grading, attempt history |
| `listening-service` | 4 | 3004 | `ielts_listening_db` | Audio test, dictation grading, part-by-part submit |
| `writing-service` | 5 | 3003 | `ielts_writing_db` | Task submission, AI grading qua RabbitMQ |
| `speaking-service` | 6 | 3005 | `ielts_speaking_db` | Recording upload, AI scoring qua RabbitMQ |
| `billing-service` | 7 | 3007 | `ielts_billing_db` | Catalog gói (FREE/PLUS/PRO), plan management |
| `payment-service` | 8 | 3008 | `ielts_payment_db` | Tích hợp cổng thanh toán (VNPay/Stripe/MoMo) |
| `notification-service` | 9 | 3009 | `ielts_notification_db` | Email/push qua RabbitMQ consumer |
| `exam-service` | — | 3006 | `ielts_exam_db` | Full mock exam kết hợp 4 kỹ năng |
| `lesson-service` | — | 3011 | `ielts_lesson_db` | Nội dung khóa học, video lesson |
| `ai-service` | — | 8000 | — | FastAPI, Gemini grading, PaddleOCR |
| `sync-daemon` | — | — | `ielts_backup_db` (target) | Đồng bộ hai chiều 9 service DB → backup DB qua Change Stream |

---

## B.3 Tổng quan Product Backlog

Chi tiết tất cả User Stories: [product-backlog.md](product-backlog.md)

### Thống kê theo Epic

| Epic | Tên | Story Points | User Stories | Trạng thái |
|---|---|---|---|---|
| E0 | Frontend Foundation | 32 | 7 | ✅ Hoàn thành |
| E1 | Auth & RBAC | 24 | 6 | ✅ Hoàn thành |
| E2 | Cloud Media | 16 | 4 | ✅ Hoàn thành |
| E3 | Reading Service | 21 | 5 | ✅ Hoàn thành |
| E4 | Listening Service | 18 | 4 | ✅ Hoàn thành |
| E5 | Writing Service | 20 | 5 | ✅ Hoàn thành |
| E6 | Speaking Service | 16 | 4 | ✅ Hoàn thành |
| E7 | AI Grading Engine | 21 | 5 | ✅ Hoàn thành |
| E8 | Billing Service | 6 | 2 | ✅ Hoàn thành |
| E9 | Payment Service | 18 | 5 | ✅ Hoàn thành |
| E10 | API Gateway + Security | 13 | 4 | ✅ Hoàn thành |
| **Tổng** | | **205** | **51** | |

---

## B.4 Sprint Overview

Chi tiết Acceptance Criteria: [user-stories.md](user-stories.md)

| Sprint | Mục tiêu | Service | Số US | Story Points |
|---|---|---|---|---|
| Sprint 0 | Thiết lập nền tảng FE (React/Vite, Tailwind, Zustand) | fe/ | 7 | 32 |
| Sprint 1 | Đăng ký, đăng nhập, JWT, RBAC | auth-service | 6 | 24 |
| Sprint 2 | Upload media, CDN, presigned URL | cloud-media-service | 4 | 16 |
| Sprint 3 | CRUD đề Reading, auto-grading band score | reading-service | 5 | 21 |
| Sprint 4 | Listening test, dictation, chấm per-part | listening-service | 4 | 18 |
| Sprint 5 | Writing Task 1/2, AI grading bất đồng bộ | writing-service | 5 | 20 |
| Sprint 6 | Speaking upload, AI scoring | speaking-service | 4 | 16 |
| Sprint 7 | Plan catalog (FREE/PLUS/PRO) | billing-service | 2 | 6 |
| Sprint 8 | Thanh toán, webhook, subscription update | payment-service | 5 | 18 |
| Sprint 9 | Thông báo qua RabbitMQ consumer | notification-service | 3 | 13 |
| Sprint 10 | API Gateway, rate limiting, security headers | api-gateway | 4 | 21 |
| **Tổng** | | | **51** | **205** |

---

## B.5 Definition of Done (áp dụng cho mọi Sprint)

| Tiêu chí | Mô tả |
|---|---|
| ✅ Code review | Pull request được ít nhất 1 reviewer approve |
| ✅ Unit tests PASS | `jest --coverage` ≥ 80% statement coverage |
| ✅ API tests PASS | Supertest với MongoMemoryServer — tất cả routes được kiểm tra |
| ✅ E2E journey PASS | Ít nhất 1 happy-path journey từ đầu đến cuối |
| ✅ Schema tests PASS | Tất cả required fields, enum constraints, index được kiểm tra |
| ✅ Regression tests PASS | Các edge case và bug đã biết không tái xuất hiện |
| ✅ Health endpoint | `GET /health` trả về `{ "status": "ok", "service": "...", "timestamp": "..." }` |
| ✅ Không có `console.log` | Sử dụng structured logger (winston/pino) |
| ✅ Không hard-code secrets | Tất cả secrets từ `.env` — không commit `.env` |
| ✅ Tài liệu API | Request/response format được cập nhật trong PHỤ LỤC F |

---

## B.6 Cấu trúc thư mục thống nhất mỗi Backend Service

Tất cả 11 Node.js service tuân theo Clean Architecture pattern:

```
<service-name>/
├── server.js              ← Entry point (HTTP listen)
├── app.js                 ← Express setup, middleware, route mounting
├── src/
│   ├── config/db.js       ← MongoDB connection
│   ├── controllers/       ← Nhận request, trả response
│   ├── services/          ← Business logic
│   ├── repositories/      ← Truy vấn DB (một số service)
│   ├── models/            ← Mongoose schemas
│   ├── routes/            ← Express router
│   ├── middlewares/       ← auth.middleware.js, error.middleware.js
│   └── utils/             ← scoreConverter.js, helpers
├── testing/ (hoặc tests/) ← Jest test files (5 cấp độ)
└── Dockerfile
```

**Luồng xử lý:** `routes → controllers → services → models`  
**Lỗi:** mọi `catch(err)` phải gọi `next(err)` để chuyển tới centralized error middleware

---

*Ngày tạo: 2026-05-18 | Nguồn: source code thực tế tại `ielts/be/`*
