# Product Backlog — IELTS-Mate Platform

> **Framework:** Agile Scrum | **Đơn vị:** Story Points (dãy Fibonacci: 1, 2, 3, 5, 8, 13)  
> **Ngày cập nhật:** 2026-05-18 | **Tổng:** 51 User Stories · 205 Story Points

---

## EPIC E0 — Frontend Foundation (Sprint 0)

**Sprint Goal:** Thiết lập nền tảng FE (kiến trúc, design system, API client, routing) để các Sprint sau tích hợp nhất quán.

| ID | User Story | SP | Priority | Status |
|---|---|---|---|---|
| E0-US01 | As a Frontend Lead, I want to define the frontend architecture baseline so that all later service integrations follow a consistent and scalable structure | 5 | HIGH | ✅ Done |
| E0-US02 | As a FE Developer, I want to initialize the frontend with React/Vite + TypeScript strict + Tailwind v3 + Zustand so that delivery starts from a production-ready base | 8 | HIGH | ✅ Done |
| E0-US03 | As a FE Developer, I want to define routing shells and protected route patterns for Student/Teacher/Admin so that role-based experiences can be integrated consistently | 5 | HIGH | ✅ Done |
| E0-US04 | As a FE Developer, I want to use AI tools (Perplexity) for architecture research so that decisions are evidence-based | 3 | MED | ✅ Done |
| E0-US05 | As a FE Developer, I want to use Google AI Studio to generate boilerplate UI components safely so that delivery speed improves | 3 | MED | ✅ Done |
| E0-US06 | As Product team, I want a reusable design-system foundation (Tailwind primitives + shared components) so that new screens have visual consistency | 5 | HIGH | ✅ Done |
| E0-US07 | As QA, I want shared FE conventions for error states, loading states, and form behavior so that integrated features behave predictably | 3 | MED | ✅ Done |

**Kết quả kỹ thuật:**
- Stack: React 18 + Vite 5 (thay Next.js), TypeScript `strict: true`, Tailwind CSS v3
- State: Zustand (`authStore`, `uiStore`) + TanStack Query v5
- Forms: React Hook Form + Zod validation
- API client: `axiosClient.ts` singleton với auth interceptor + 401 auto-logout

---

## EPIC E1 — Auth & RBAC (Sprint 1)

**Sprint Goal:** Triển khai đăng ký, đăng nhập, JWT, RBAC và quản lý tài khoản để bảo vệ toàn bộ hệ thống.

| ID | User Story | SP | Priority | Status |
|---|---|---|---|---|
| E1-US01 | As a Guest, I want to register an account with email/password so that I can access IELTS practice features | 5 | CRITICAL | ✅ Done |
| E1-US02 | As a Student, I want to log in securely with JWT (7 days) so that my session persists across browser refreshes | 3 | CRITICAL | ✅ Done |
| E1-US03 | As an authenticated user, I want my session and profile loaded after login so that the UI shows correct permissions and navigation | 3 | HIGH | ✅ Done |
| E1-US04 | As Admin, I want RBAC enforced across Admin/Teacher/Student roles so that only authorized users access restricted endpoints | 5 | HIGH | ✅ Done |
| E1-US05 | As a VIP Student, I want my subscription plan (FREE/PLUS/PRO) reflected in my profile so that gated features activate correctly | 3 | MED | ✅ Done |
| E1-US06 | As Admin, I want to update user roles and subscription states so that access changes take effect immediately | 5 | HIGH | ✅ Done |

**API hoàn thiện:** `POST /register`, `POST /login`, `GET /profile`, `PUT /profile`, `PUT /change-password`, `PUT /update-role/:id`, `PATCH /internal/users/:id/subscription`  
**Model chính:** `User` (email unique, bcrypt hash, role enum, plan enum, `vipValidUntil`, `isActive`)

---

## EPIC E2 — Cloud Media Service (Sprint 2)

**Sprint Goal:** Xây dựng dịch vụ upload/quản lý media tập trung cho audio (listening), recording (speaking), và ảnh bài thi.

| ID | User Story | SP | Priority | Status |
|---|---|---|---|---|
| E2-US01 | As a Teacher, I want to upload audio files (MP3/WAV) for listening tests so that students can hear real IELTS-style recordings | 5 | HIGH | ✅ Done |
| E2-US02 | As a Teacher, I want presigned/CDN URLs for uploaded files so that media is securely accessible without exposing server paths | 3 | HIGH | ✅ Done |
| E2-US03 | As a Student, I want to upload speaking recordings (WebM/MP4) so that AI can analyze my pronunciation and fluency | 5 | HIGH | ✅ Done |
| E2-US04 | As Admin, I want to list and delete media files so that storage is managed efficiently | 3 | MED | ✅ Done |

**API:** `POST /upload` (multipart), `GET /files` (paginated), `GET /files/:id`, `DELETE /files/:id`

---

## EPIC E3 — Reading Service (Sprint 3)

**Sprint Goal:** CRUD đề thi Reading nhiều passage, tự động chấm điểm theo bảng band score IELTS chuẩn.

| ID | User Story | SP | Priority | Status |
|---|---|---|---|---|
| E3-US01 | As a Teacher, I want to create multi-passage reading tests with multiple question types so that students practice all IELTS Reading formats | 5 | CRITICAL | ✅ Done |
| E3-US02 | As a Student, I want to list and attempt reading tests (full test or per-passage) so that I can practice at my own pace | 3 | CRITICAL | ✅ Done |
| E3-US03 | As a Student, I want my raw score (0–40) automatically converted to IELTS band score (1.0–9.0) so that I know my current level | 5 | HIGH | ✅ Done |
| E3-US04 | As a Teacher/Admin, I want to view all student attempts with scores and answer details so that I can monitor class progress | 5 | HIGH | ✅ Done |
| E3-US05 | As Admin/Teacher, I want aggregate stats per test (average band, distribution) so that I can identify difficult questions | 3 | MED | ✅ Done |

**Question types:** `MULTIPLE_CHOICE`, `FILL_IN_BLANK`, `MATCHING`, `TFNG` (True/False/Not Given), `YNNG` (Yes/No/Not Given)  
**Score conversion:** rawScore 0–40 → bandScore 1.0–9.0 theo IELTS Cambridge table  
**normalizeAnswer():** lowercase + trim + collapse whitespace + alternate forms

---

## EPIC E4 — Listening Service (Sprint 4)

**Sprint Goal:** Test nghe 4 part theo chuẩn IELTS, chấm điểm tự động per-part và toàn đề.

| ID | User Story | SP | Priority | Status |
|---|---|---|---|---|
| E4-US01 | As a Teacher, I want to create 4-part listening tests with audio files so that students experience authentic IELTS listening format | 5 | CRITICAL | ✅ Done |
| E4-US02 | As a Student, I want to listen and submit answers per part or full test so that I can stop and resume listening practice | 5 | CRITICAL | ✅ Done |
| E4-US03 | As a Student, I want dictation exercises with exact-match auto-grading so that my transcription accuracy is measured precisely | 5 | HIGH | ✅ Done |
| E4-US04 | As a Teacher/Admin, I want attempt history per student and per test so that listening progress is tracked over time | 3 | MED | ✅ Done |

**Question types:** `multiple_choice`, `fill_blank`, `map_labeling`, `matching`  
**Dictation grading:** exact string comparison after `trim().toLowerCase().replace(/\s+/g, ' ')`

---

## EPIC E5 — Writing Service (Sprint 5)

**Sprint Goal:** Nộp bài Task 1/Task 2, AI chấm điểm bất đồng bộ theo 4 tiêu chí IELTS Writing.

| ID | User Story | SP | Priority | Status |
|---|---|---|---|---|
| E5-US01 | As a Teacher, I want to create writing prompts for Task 1 (graph/chart) and Task 2 (essay) so that students practice authentic IELTS writing tasks | 3 | HIGH | ✅ Done |
| E5-US02 | As a Student, I want to submit my essay and receive AI-graded feedback within minutes so that I know my band score without waiting for a teacher | 5 | CRITICAL | ✅ Done |
| E5-US03 | As AI Service, I want to grade essays using Google Gemini on 4 criteria (TR/CC/LR/GRA) so that grading is consistent and unbiased | 5 | CRITICAL | ✅ Done |
| E5-US04 | As a Teacher, I want to review, override, and add comments to AI grades so that nuanced human feedback supplements AI evaluation | 5 | HIGH | ✅ Done |
| E5-US05 | As a Student, I want paginated submission history with band score trend so that I can track writing improvement over time | 2 | MED | ✅ Done |

**Tiêu chí chấm điểm (0–9 mỗi tiêu chí):**
- **TR** — Task Response / Task Achievement (mức độ trả lời đúng yêu cầu đề)
- **CC** — Coherence & Cohesion (mạch lạc, liên kết đoạn văn)
- **LR** — Lexical Resource (vốn từ vựng, tính chính xác)
- **GRA** — Grammatical Range & Accuracy (cú pháp, đa dạng mẫu câu)

---

## EPIC E6 — Speaking Service (Sprint 6)

**Sprint Goal:** Upload recording bài nói, AI chấm điểm 4 tiêu chí Speaking.

| ID | User Story | SP | Priority | Status |
|---|---|---|---|---|
| E6-US01 | As a Teacher, I want to create speaking prompts for Part 1/2/3 so that students practice all IELTS Speaking formats | 3 | HIGH | ✅ Done |
| E6-US02 | As a Student, I want to upload recordings and receive AI scores so that I can practice speaking without a human examiner | 5 | CRITICAL | ✅ Done |
| E6-US03 | As AI Service, I want to score recordings on Fluency, Vocabulary, Grammar, and Pronunciation so that feedback covers all IELTS criteria | 5 | CRITICAL | ✅ Done |
| E6-US04 | As a Student, I want to view speaking history with scores per attempt so that I can compare sessions | 3 | MED | ✅ Done |

---

## EPIC E7 — AI Grading Engine (Python/FastAPI)

**Sprint Goal:** Dịch vụ AI chạy độc lập trên Python/FastAPI, nhận jobs từ RabbitMQ, chấm điểm với Gemini.

| ID | User Story | SP | Priority | Status |
|---|---|---|---|---|
| E7-US01 | As writing-service, I want writing essays graded via RabbitMQ so that HTTP responses are not blocked while AI processes | 5 | CRITICAL | ✅ Done |
| E7-US02 | As speaking-service, I want recordings transcribed and scored via RabbitMQ so that AI scoring is decoupled from the upload flow | 5 | CRITICAL | ✅ Done |
| E7-US03 | As a Teacher, I want OCR extraction for image-based writing prompts (scanned papers) so that handwritten content can be processed | 5 | HIGH | ✅ Done |
| E7-US04 | As the system, I want structured JSON grading output from Gemini validated by Pydantic so that bad AI responses are caught early | 3 | HIGH | ✅ Done |
| E7-US05 | As Admin, I want health endpoint for AI service monitoring so that downtime is detected immediately | 3 | MED | ✅ Done |

**Stack:** Google Gemini API (`gemini-pro`) + PaddleOCR + FastAPI + Pydantic v2 + amqplib consumer

---

## EPIC E8 — Billing Service (Sprint 7)

**Sprint Goal:** Quản lý catalog gói đăng ký tập trung để payment-service và FE có nguồn dữ liệu chung.

| ID | User Story | SP | Priority | Status |
|---|---|---|---|---|
| E8-US01 | As Admin, I want to manage Plus and Pro plan catalog (CRUD) so that package definitions are configurable without code changes | 3 | HIGH | ✅ Done |
| E8-US02 | As payment workflow, I want plan data sourced from billing-service so that pricing logic is centralized in one place | 3 | HIGH | ✅ Done |

**Gói mặc định:**
| Code | Tên | Giá | Thời hạn | Kỹ năng |
|---|---|---|---|---|
| `FREE` | Miễn phí | 0 VNĐ | Vô thời hạn | Reading |
| `PLUS` | Plus | 599.000 VNĐ/năm | 12 tháng | Reading + Listening + Writing |
| `PRO` | Pro | 999.000 VNĐ/năm | 12 tháng | 4 kỹ năng + Full Mock Test |

---

## EPIC E9 — Payment Service (Sprint 8)

**Sprint Goal:** Tích hợp cổng thanh toán, xử lý webhook, cập nhật subscription sau thanh toán thành công.

| ID | User Story | SP | Priority | Status |
|---|---|---|---|---|
| E9-US01 | As a Student, I want to subscribe to Plus/Pro plans with a single payment flow so that activation is instant | 5 | CRITICAL | ✅ Done |
| E9-US02 | As a User, I want to pay securely via supported gateways (VNPay/Stripe/MoMo) so that payment methods are familiar | 5 | CRITICAL | ✅ Done |
| E9-US03 | As the system, I want payment webhooks to automatically update user subscriptions in auth-service so that access is granted without manual intervention | 5 | HIGH | ✅ Done |
| E9-US04 | As a User, I want to view my payment history with status (pending/completed/failed) so that I can track my transactions | 3 | MED | ✅ Done |
| E9-US05 | As Admin, I want to view all transactions with filter/search so that revenue and failed payments are monitored | 5 | MED | ✅ Done |

---

## EPIC E10 — API Gateway + Security (Sprint 10)

**Sprint Goal:** Gateway tập trung tất cả traffic, rate limiting, CORS, auth-proxy, API key management.

| ID | User Story | SP | Priority | Status |
|---|---|---|---|---|
| E10-US01 | As the system, I want all client traffic routed through a single API Gateway so that microservices are not directly exposed | 5 | CRITICAL | ✅ Done |
| E10-US02 | As the system, I want rate limiting per IP (Redis) and per API key so that abuse and DoS are prevented | 3 | HIGH | ✅ Done |
| E10-US03 | As a Developer, I want consistent CORS headers and JWT forwarding to downstream services so that FE integration works without per-service CORS config | 3 | HIGH | ✅ Done |
| E10-US04 | As Admin, I want API key management (create/revoke/quota) so that third-party integrations are controlled | 2 | MED | ✅ Done |

---

*Tổng: 51 User Stories · 205 Story Points · Tất cả ✅ Done · 2026-05-18*
