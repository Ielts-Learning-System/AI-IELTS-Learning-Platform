# Kết Quả Đạt Được — IELTS-Mate Platform

> **Dự án:** Nền tảng luyện thi IELTS SaaS — Kiến trúc Microservices  
> **Thời gian:** 3 tháng (Sprint 0 → Sprint 10)  
> **Ngày báo cáo:** 2026-05-18

---

## 1. Tổng quan hệ thống

| Hạng mục | Số liệu |
|---|---|
| Số microservices triển khai | **13** (12 Node.js + 1 Python/FastAPI) |
| Số cơ sở dữ liệu độc lập | **11 MongoDB databases** |
| Số Sprint hoàn thành | **10 Sprints** (Sprint 0–10) |
| Giao tiếp nội bộ | REST/HTTP + RabbitMQ AMQP |
| Containerisation | Docker + Docker Compose |

---

## 2. Các dịch vụ đã triển khai

| Sprint | Service | Port | Chức năng chính |
|---|---|---|---|
| 0 | Frontend (React/Next.js) | — | SPA + App Router, Tailwind, Zustand |
| 1 | `auth-service` | 3001 | Đăng ký, đăng nhập, JWT, RBAC |
| 2 | `cloud-media-service` | 3010 | Upload file, CDN, presigned URL |
| 3 | `writing-service` | 3003 | Chấm Writing Task 1 & 2 bằng AI |
| 4 | `speaking-service` | 3005 | Chấm Speaking qua AI |
| 5 | `reading-service` | 3002 | Thi Reading, tự chấm điểm |
| 6 | `listening-service` | 3004 | Thi Listening, dictation |
| 7 | `billing-service` | 3007 | Quản lý gói Plus / Pro |
| 8 | `payment-service` | 3008 | Tích hợp cổng thanh toán |
| 9 | `notification-service` | 3009 | Email / push qua RabbitMQ |
| 10 | `api-gateway` | 3000 | Auth proxy, rate limiting, routing |
| — | `exam-service` | 3006 | Full Mock Test (4 kỹ năng) |
| — | `lesson-service` | 3011 | Course content, video lessons |
| — | `ai-service` | 8000 | FastAPI + Gemini + PaddleOCR |

---

## 3. Dữ liệu thực tế trong hệ thống

| Database | Collections | Documents |
|---|---|---|
| `ielts_auth_db` | 4 | 35 |
| `ielts_listening_db` | 3 | **112** |
| `ielts_notification_db` | 3 | 45 |
| `ielts_payment_db` | 2 | 26 |
| `ielts_billing_db` | 5 | 13 |
| `ielts_writing_db` | 3 | 18 |
| `ielts_reading_db` | 2 | 20 |
| `ielts_speaking_db` | 2 | 12 |
| `ielts_exam_db` | 3 | 11 |
| `ielts_lesson_db` | 1 | 6 |
| `ielts_media_db` | — | — |
| **Tổng** | **28** | **~298** |

---

## 4. Kiểm thử toàn bộ backend core services

| Test Suite | Loại | Test Cases | Kết quả |
|---|---|---|---|
| `reading-service` | schema / unit / api / e2e / regression / integration | 197 | 🟢 197/197 PASS |
| `auth-service` | schema / unit / api / e2e / regression / integration | 105 | 🟢 105/105 PASS |
| `writing-service` | schema / unit / api / e2e / regression / integration | 78 | 🟢 78/78 PASS |
| `listening-service` | schema / unit / api / e2e / regression / integration | 67 | 🟢 67/67 PASS |
| `speaking-service` | schema / unit / api / e2e / regression / integration | 64 | 🟢 64/64 PASS |
| `billing-service` | schema / unit / api / e2e / regression / integration | 130 | 🟢 130/130 PASS |
| `payment-service` | schema / unit / api / e2e / regression / integration | 95 | 🟢 95/95 PASS |
| `notification-service` | schema / unit / api / e2e / regression / integration | 52 | 🟢 52/52 PASS |
| `exam-service` | schema / unit / api / e2e / regression | 26 | 🟢 26/26 PASS |
| `lesson-service` | schema / unit / api / e2e / regression | 25 | 🟢 25/25 PASS |
| `cloud-media-service` | integration | 11 | 🟢 11/11 PASS |
| **Tổng** | — | **850** | **🟢 850/850 PASS** |

> Framework: Jest 29 · Supertest · mongodb-memory-server · 0 failures  
> Chạy thực tế ngày 2026-05-18 — 850/850 PASS trên 11 service (61 test file)

---

## 5. Tài liệu kỹ thuật

| File | Nội dung |
|---|---|
| `reading-service/docs/PRD.md` | 5 Epics · 11 User Stories · 50+ Acceptance Criteria |
| `auth-service/docs/*` | Auth/RBAC/refresh-token flow |
| `writing-service/docs/*` | Writing AI grading contracts |
| `listening-service/docs/*` | Listening test + dictation contracts |
| `speaking-service/docs/*` | Speaking recording & AI scoring |
| `billing-service/docs/*` | Plan/subscription lifecycle |
| `payment-service/docs/*` | VietQR payment + transaction lifecycle |
| `notification-service/docs/*` | Notification inbox + preferences + push |
| `exam-service/docs/*` | Full mock test orchestration |
| `lesson-service/docs/*` | Lesson content management |
| `testing/cross-check.md` | Ma trận xác minh đa AI (Gemini · Claude · GPT) |

---

## 6. Tính năng nổi bật

- **Tự chấm điểm tức thời** — Reading/Listening: chuyển đổi rawScore → band score theo bảng IELTS chính thức
- **Chấm AI** — Writing/Speaking: Google Gemini phân tích 4 tiêu chí IELTS
- **Multi-AI Verification** — bộ test được xác minh bởi 3 AI model độc lập
- **Kiến trúc Database-per-service** — 11 database hoàn toàn độc lập, không cross-DB
- **Rate limiting + JWT rotation** — Redis + refresh token, bảo mật theo OWASP
- **RabbitMQ async pipeline** — grading nặng không block API response
- **Test coverage toàn hệ backend** — 850 testcase PASS trên 11 service (bao gồm cloud-media-service), 61 test file, 0 failures
