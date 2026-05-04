# Tài liệu Yêu cầu Sản phẩm (PRD)
## Nền tảng Luyện thi IELTS — Giai đoạn Pre-project

> **Phiên bản:** 1.0 · **Ngày cập nhật:** Tháng 5/2026  
> **Kiến trúc:** Microservices · Database-per-Service · RabbitMQ Event-Driven

---

## 1. Tầm nhìn Sản phẩm

Xây dựng một nền tảng luyện thi IELTS **toàn diện** giúp học viên tự học hiệu quả thông qua hệ thống thi thử 4 kỹ năng (Reading, Listening, Writing, Speaking), kết hợp:
- **Chấm điểm tự động tức thì** cho Reading & Listening.
- **Chấm điểm bởi Giáo viên** cho Writing & Speaking theo tiêu chí IELTS Band.
- **AI hỗ trợ** trích xuất đề thi từ PDF và tạo phản hồi học tập.
- **Hệ thống VIP** với kiểm soát truy cập dựa trên gói dịch vụ.

---

## 2. Bản đồ Tính năng Tổng quan

```mermaid
mindmap
  root((IELTS Platform))
    Học viên
      Luyện kỹ năng
        Reading Practice
        Listening Practice
        Writing Submission
        Speaking Submission
      Thi thử toàn phần
        Mock Test 4 kỹ năng
        Đếm giờ per-skill
        Nộp bài tự động khi hết giờ
      Theo dõi tiến độ
        Lịch sử làm bài
        Band Score History
        Thống kê per-skill
      Đăng ký VIP
        Xem gói FREE / PLUS / PRO
        Thanh toán VietQR
        Nhận thông báo kết quả
    Giáo viên
      Quản lý nội dung
        Tạo đề Reading
        Tạo đề Listening
        Tạo đề Writing
        Tạo đề Speaking
        Upload PDF → AI trích xuất đề
      Chấm bài
        Writing Pending Queue
        Speaking Pending Queue
        Nhập điểm TR·CC·LR·GRA
        Nhập điểm FC·LR·GRA·PR
        Gửi phản hồi cho học viên
      Giám sát
        Xem danh sách thí sinh
        Monitoring Exam Attempts
    Admin
      Quản lý người dùng
        Phân quyền Role
        Kích hoạt / Khoá tài khoản
      Quản lý gói dịch vụ
        Tạo Plan CODE
        Thiết lập benefits.skills
        maxFullTests · maxHours
      Phê duyệt thanh toán
        Xem giao dịch Pending
        Approve → Kích hoạt VIP
        Reject → Thông báo học viên
      Cấu hình AI
        Quản lý Gemini API Key
        Tuỳ chỉnh Prompt Templates
        Theo dõi Token Quota
```

---

## 3. Đối tượng Người dùng

| Vai trò | Mô tả | Quyền hệ thống |
|:--------|:------|:---------------|
| **Student** | Học viên tự học, đăng ký gói FREE/VIP | Làm bài, nộp bài, xem kết quả của chính mình |
| **Teacher** | Giảng viên tạo đề, chấm bài Writing/Speaking | Tạo/sửa đề, xem queue chấm, nhập điểm |
| **Admin** | Quản trị viên toàn hệ thống | Mọi quyền Teacher + phê duyệt thanh toán + quản lý hệ thống |

---

## 4. Hành trình Người dùng

```mermaid
journey
    title Hành trình Học viên — Từ đăng ký đến hoàn thành Mock Test
    section Onboarding
      Đăng ký tài khoản (email+password): 5: Student
      Nhận email chào mừng (RabbitMQ → Socket.io): 4: Student
      Xem trang chủ gói dịch vụ: 3: Student
    section Nâng cấp VIP
      Chọn gói VIP_1_MONTH / VIP_6_MONTH: 4: Student
      Quét mã VietQR – chuyển khoản: 3: Student
      Admin duyệt giao dịch: 3: Admin
      Nhận thông báo kích hoạt VIP: 5: Student
    section Luyện tập đơn kỹ năng
      Chọn đề Reading – làm bài: 5: Student
      Nộp bài – nhận điểm tức thì: 5: Student
      Nộp Writing – chờ giáo viên chấm: 3: Student
      Nhận thông báo Writing đã chấm: 5: Student
    section Thi thử toàn phần
      Vào trang Mock Test – chọn đề: 5: Student
      Làm lần lượt 4 kỹ năng có đồng hồ: 4: Student
      Nộp bài (thủ công hoặc tự động hết giờ): 4: Student
      Xem kết quả tổng hợp Overall Band: 5: Student
```

---

## 5. Epics & User Stories Chi tiết

### Epic 1 — Xác thực & Phân quyền (`auth-service`)

```mermaid
graph LR
    A[Khách] -->|POST /api/auth/register| B[Tạo tài khoản Student]
    B -->|RabbitMQ: auth.user.registered| C[notification-service gửi welcome]
    D[Người dùng] -->|POST /api/auth/login| E[Nhận JWT Token]
    E --> F{Vai trò?}
    F -->|Admin| G[Admin Dashboard]
    F -->|Teacher| H[Teacher Dashboard]
    F -->|Student| I[Student Dashboard]
```

| Story ID | Mô tả | Điều kiện chấp nhận |
|:---------|:------|:--------------------|
| US-A01 | Học viên đăng ký bằng email/mật khẩu | Tài khoản được tạo với `role=Student`, `plan=FREE` |
| US-A02 | Người dùng đăng nhập nhận JWT | JWT có payload `{userId, role, plan}` |
| US-A03 | Admin thay đổi role người dùng | `PUT /api/users/:id/role` chỉ Admin được gọi |
| US-A04 | Admin khoá / mở tài khoản | `isActive` toggle, user bị khoá nhận 403 |

---

### Epic 2 — Luyện tập Reading (`reading-service`)

| Story ID | Mô tả | Loại câu hỏi hỗ trợ |
|:---------|:------|:--------------------|
| US-R01 | Teacher tạo đề Reading | MULTIPLE_CHOICE, FILL_IN_BLANK, MATCHING, TFNG, YNNG |
| US-R02 | Student xem danh sách đề (public) | Không cần đăng nhập |
| US-R03 | Student nộp bài → hệ thống tự chấm | `rawScore`, `bandScore` trả về ngay lập tức |
| US-R04 | Teacher/Admin xem tất cả attempts | `GET /api/reading/attempts` |
| US-R05 | AI tạo đề từ parameters | `POST /api/reading/generate-ai` |

---

### Epic 3 — Luyện tập Listening (`listening-service`)

| Story ID | Mô tả | Ghi chú |
|:---------|:------|:--------|
| US-L01 | Teacher tạo đề 4 Parts với audio URL | Part 1–4, mỗi part có `audioUrl` trên Cloudinary |
| US-L02 | Student nghe và trả lời | multiple_choice, fill_blank, map_labeling, matching |
| US-L03 | Nộp bài → auto-grade tức thì | Tương tự Reading |

---

### Epic 4 — Writing (`writing-service`) — Chấm thủ công bởi Teacher

```mermaid
graph TD
    S[Student] -->|POST /api/writing/submissions| P[WritingSubmission: status=Pending]
    P -->|RabbitMQ: writing.submission.created| N[Notification → Teacher]
    T[Teacher] -->|GET /api/writing/submissions/pending| Q[Queue bài chờ chấm]
    Q -->|PUT /api/writing/submissions/:id/grade| G[Nhập điểm TR·CC·LR·GRA]
    G --> GR[WritingSubmission: status=Graded]
    GR -->|RabbitMQ: writing.grading.completed| NS[Notification → Student]
```

| Tiêu chí chấm | Mô tả |
|:-------------|:------|
| **TR** — Task Response | Mức độ đáp ứng yêu cầu đề bài (0–9) |
| **CC** — Coherence & Cohesion | Tính mạch lạc, liên kết (0–9) |
| **LR** — Lexical Resource | Vốn từ vựng (0–9) |
| **GRA** — Grammatical Range & Accuracy | Ngữ pháp (0–9) |

---

### Epic 5 — Speaking (`speaking-service`) — Chấm thủ công bởi Teacher

| Cấu trúc bài thi | Nội dung |
|:----------------|:---------|
| **Part 1** | Mảng câu hỏi giao tiếp thông thường (p1_0, p1_1, …) |
| **Part 2** | Cue card — học viên nói về một chủ đề (p2) |
| **Part 3** | Mảng câu hỏi thảo luận nâng cao (p3_0, p3_1, …) |

| Tiêu chí chấm | Mô tả |
|:-------------|:------|
| **FC** — Fluency & Coherence | Sự trôi chảy, mạch lạc |
| **LR** — Lexical Resource | Vốn từ |
| **GRA** — Grammatical Range | Ngữ pháp |
| **PR** — Pronunciation | Phát âm |

---

### Epic 6 — Thi thử Mock Test (`exam-service`)

```mermaid
stateDiagram-v2
    [*] --> DRAFT : Teacher tạo Exam
    DRAFT --> PUBLISHED : Teacher publish
    PUBLISHED --> IN_PROGRESS : Student bắt đầu thi
    IN_PROGRESS --> SUBMITTED : Student nộp bài
    IN_PROGRESS --> EXPIRED : Hết giờ toàn bài (globalEndTime)
    SUBMITTED --> GRADED : Writing/Speaking được chấm
    EXPIRED --> GRADED : Auto-submit + chấm tự động R/L
```

**Luồng skill trong một lần thi:**
- Exam chứa **4 `skillRefs`** (readingId, listeningId, writingId, speakingId).
- Mỗi kỹ năng có **thời gian riêng**: Reading 60', Listening 30', Writing 60', Speaking 15'.
- `SkillAttempt.autoSubmitted = true` khi hết giờ từng kỹ năng.
- `ExamAttempt.globalEndTime` = thời điểm hết hạn toàn bộ bài thi.

---

### Epic 7 — AI Grading & PDF Extraction (`ai-service`)

```mermaid
graph TD
    T[Teacher upload PDF] -->|POST /api/ai/extract-writing-pdf| AI[ai-service FastAPI]
    AI -->|pypdf trích xuất ảnh| IMG[Embedded images]
    AI -->|Gemini API call| G[Google Gemini 2.5 Flash]
    G --> JSON[Structured JSON Tasks]
    JSON --> WS[writing-service lưu đề]

    S[Student nộp bài] --> WS2[writing-service]
    WS2 -->|POST /api/ai/grade-writing| AI2[ai-service]
    AI2 -->|Prompt Template từ SystemConfig DB| G2[Gemini API]
    G2 --> BAND[Band scores TR·CC·LR·GRA + Feedback]
```

| Tính năng AI | Endpoint | Mô tả |
|:------------|:---------|:------|
| Trích xuất đề Writing từ PDF | `/api/ai/extract-writing-pdf` | pypdf → Gemini multimodal |
| Trích xuất đề Speaking từ PDF | `/api/ai/extract-speaking-pdf` | Gemini xử lý text từ PDF |
| Chấm Writing tự động | `/api/ai/grade-writing` | Prompt chuẩn IELTS → JSON band scores |
| Chấm Speaking tự động | `/api/ai/grade-speaking` | Tương tự Writing |
| Tạo đề Reading từ AI | `/api/reading/generate-ai` | Gemini generate câu hỏi |

**Cơ chế API Key:** Key được lưu trong `SystemConfig.geminiApiKey` (trên auth-service DB, `select: false`). AI service **fetch key qua internal endpoint** `/api/internal/system-config` mỗi request, không hardcode trong env.

---

### Epic 8 — Thanh toán VIP (`billing-service` + `payment-service`)

```mermaid
graph LR
    S[Student] -->|GET /api/billing/plans| Plans[Danh sách gói]
    S -->|POST /api/payment/create-transaction| TX[Transaction: Pending]
    TX -->|Hiển thị QR VietQR| QR[Student chuyển khoản]
    Admin -->|POST /api/payment/approve/:id| A[Approve]
    A -->|PATCH /internal/users/:id/subscription| Auth[Cập nhật vipValidUntil]
    A -->|RabbitMQ: payment.transaction.approved| Notif[Thông báo kích hoạt VIP]
```

| Gói | Code | Skills | maxFullTests |
|:----|:-----|:-------|:------------|
| Miễn phí | FREE | reading, listening | 0 |
| Nâng cao | PLUS | reading, listening, writing | Giới hạn |
| Toàn diện | PRO | reading, listening, writing, speaking | Không giới hạn |

---

### Epic 9 — Thông báo Real-time (`notification-service`)

| Event RabbitMQ | Loại thông báo |
|:--------------|:---------------|
| `auth.user.registered` | Chào mừng tài khoản mới |
| `writing.submission.created` | Thông báo Teacher có bài chờ chấm |
| `writing.grading.completed` | Thông báo Student bài đã chấm xong |
| `speaking.grading.completed` | Tương tự Writing |
| `payment.transaction.approved` | VIP đã được kích hoạt |
| `payment.transaction.rejected` | Thanh toán bị từ chối |
| `reading.test.completed` | Hoàn thành bài Reading |
| `listening.test.completed` | Hoàn thành bài Listening |
| `billing.subscription.*` | Huỷ / Khôi phục subscription |

---

## 6. Ràng buộc Phi chức năng

| Loại | Yêu cầu |
|:-----|:--------|
| **Hiệu suất** | Chấm Reading/Listening trong < 1 giây sau khi nộp |
| **Độ tin cậy** | Notification failure không ảnh hưởng pipeline chấm bài |
| **Bảo mật** | JWT xác thực mọi route bảo vệ; Gemini API Key không bao giờ trả về client |
| **Khả năng mở rộng** | Mỗi service độc lập, scale riêng biệt |
| **Audit** | Mọi notification được log trong `NotificationLog` với `isRead`, `readAt` |
