# Tài Liệu Yêu Cầu Sản Phẩm (PRD)
## IELTS-Mate — Nền Tảng Học IELTS Tích Hợp AI

| Trường | Chi tiết |
|---|---|
| **Phiên bản tài liệu** | v1.0 |
| **Trạng thái** | Draft |
| **Nhóm tác giả** | AI Product Team |
| **Ngày** | 2026-05-15 |
| **Bảo mật** | Nội bộ — R&D |

---

## A. TỔNG QUAN SẢN PHẨM

**IELTS-Mate** là nền tảng web học IELTS tích hợp AI, cung cấp phản hồi theo chuẩn rubric chính thức cho 4 kỹ năng: Reading, Listening, Writing, Speaking. Nền tảng kết hợp mô hình lai giữa **giáo viên chấm thủ công** và **AI hỗ trợ phản hồi tự động**, thay thế vòng lặp chấm bài chậm và thiếu nhất quán của phương pháp truyền thống.

Hệ thống được xây dựng trên **kiến trúc microservices** gồm 13 service độc lập, container hóa bằng Docker Compose, giao tiếp qua API Gateway trung tâm. Động cơ AI sử dụng **Google Gemini** (`gemini-2.5-flash-preview-04-17`) với cơ chế luân chuyển API key tự động và prompt template do Admin cấu hình — không có API key nào xuất hiện ở phía client.

### Kiến trúc tổng thể

```
Frontend (React + Vite + TypeScript)
        │ HTTPS (:3000)
   API Gateway  ←── Redis (rate limit, cache)
        │
  ┌─────┼──────────────────────────────────────┐
  │     │                                        │
auth  writing  reading  listening  speaking  billing
:3001  :3004   :3002     :3003      :3008     :3005
  │                                        │
  │     lesson  media  payment  notif  exam  ai-service
  │     :3007  :3010   :3009   :3011  :3013    :3012
  │                                              │
  └──── MongoDB (per-service DB) ────────────────┘
        RabbitMQ (async messaging)
```

---

## B. PHÁT BIỂU VẤN ĐỀ

> **"Người học luyện tập nhiều nhưng tiến bộ chậm vì phản hồi bị trì hoãn, quá chung chung và không chỉ ra được lỗi gốc rễ theo từng tiêu chí rubric."**

Ba vấn đề hệ thống cốt lõi:

1. **Phản hồi chậm**: Giáo viên truyền thống trả bài sau 24–72 giờ; động lực học suy giảm trước khi nhận được nhận xét.
2. **Chẩn đoán nông**: Các công cụ AI hiện tại chỉ trả về một band score tổng, không phân tích theo 4 tiêu chí rubric chính thức của IELTS.
3. **Vòng lặp cải thiện bị đứt**: Không nền tảng nào đóng được vòng lặp: nộp bài → chẩn đoán lỗi gốc → sửa có mục tiêu → kiểm tra lại kỹ năng đó → xác nhận tiến bộ.

---

## C. NGƯỜI DÙNG MỤC TIÊU

### Personas chính

| Persona | Mô tả | Mục tiêu | Mức sẵn sàng trả tiền |
|---|---|---|---|
| **Học sinh / Sinh viên** | 18–24 tuổi, đang chuẩn bị du học, mục tiêu band 6.5–7.5 | Tăng điểm trong thời gian có hạn | Trung bình — sẽ trả nếu thấy giá trị |
| **Người đi làm** | 25–35 tuổi, cần IELTS cho visa / công việc, ít thời gian | Luyện tập tập trung, không lãng phí | Cao — đánh giá cao thời gian |
| **Người tự học** | Không tiếp cận được gia sư chất lượng, lần đầu thi | Công cụ thay thế gia sư, giá phải chăng | Thấp đến trung bình |

### Personas thứ cấp

| Persona | Vai trò trong hệ thống |
|---|---|
| **Giáo viên (Teacher)** | Tạo đề thi, chấm bài Writing/Speaking, theo dõi tiến độ học sinh |
| **Quản trị viên (Admin)** | Quản lý người dùng, gói dịch vụ, giao dịch thanh toán, cấu hình AI |

> **Phân vai trò trong mã nguồn**: `role` ∈ `['Admin', 'Teacher', 'Student']` — xem `User.js` trong `auth-service`.

---

## D. ĐIỂM ĐAU CỦA NGƯỜI DÙNG

Dựa trên phân tích R&D và kiểm tra trực tiếp hệ thống hiện có:

| Mã | Điểm đau | Mức độ | Bằng chứng từ mã nguồn |
|---|---|---|---|
| P-01 | Chỉ nhận được điểm tổng, không biết tiêu chí nào kéo điểm xuống | Nghiêm trọng | `WritingSubmission.grading.criteria` chỉ được điền khi Teacher chấm thủ công |
| P-02 | Phản hồi Writing chậm — phải chờ Teacher chấm (status: `Pending` → `Graded`) | Cao | Route `PUT /:id/grade` chỉ Teacher/Admin mới gọi được |
| P-03 | Không có kế hoạch sửa lỗi ưu tiên sau khi nhận điểm | Cao | `aiFeedback` trong schema là `Mixed`, không có cấu trúc chuẩn |
| P-04 | Speaking feedback không có follow-up động, độ khó cố định | Cao | `speaking-service` chưa có AI examiner thích nghi |
| P-05 | Không đo được tiến bộ theo từng tiêu chí qua nhiều lần nộp bài | Cao | Không có endpoint aggregation trend theo `TR/CC/LR/GRA` |
| P-06 | Kỳ thi mock (exam-service) chưa có kết quả Writing/Speaking tự động | Trung bình | `gradeAttempt` vẫn cần Teacher gọi thủ công |
| P-07 | Không có tín hiệu độ tin cậy cho điểm AI | Trung bình | `aiFeedback` schema không có `confidence_pct` |
| P-08 | Học sinh không biết gói nào cho phép kỹ năng nào cho đến khi bị chặn | Trung bình | `requireSkill` middleware trả 403 sau khi đã vào trang |

---

## E. GIÁ TRỊ CẠNH TRANH ĐỘC ĐÁO

| Trụ cột | Năng lực của IELTS-Mate | Khoảng trống đối thủ |
|---|---|---|
| **Chẩn đoán theo rubric** | Điểm riêng cho TR, CC, LR, GRA (Writing) và FC, LR, GRA, P (Speaking) | Đối thủ chỉ trả 1 band tổng |
| **Mô hình lai Teacher + AI** | Teacher chấm nhanh → AI bổ sung phản hồi sâu → học sinh có cả hai góc nhìn | Đối thủ chọn hoặc AI hoặc tutor |
| **Quản lý API key pool** | Pool nhiều Gemini key, tự động rotate khi hết quota → không gián đoạn dịch vụ | Hầu hết dùng 1 key cứng |
| **Prompt template động** | Admin chỉnh prompt cho từng kỹ năng qua AIManager UI, không cần redeploy | Prompt cứng trong code |
| **Exam service đầy đủ** | Mock exam 4 kỹ năng, nhập đề từ PDF, tiến trình qua SSE | Không có mock exam tích hợp |
| **Kiến trúc microservices** | Mỗi kỹ năng là 1 service độc lập, nâng cấp AI model không ảnh hưởng service khác | Monolith không scale được |

---

## F. PHẠM VI MVP (HIỆN TẠI) & LỘ TRÌNH

### ĐÃ TRIỂN KHAI — v1.0 (Hiện tại)

| # | Tính năng | Service chịu trách nhiệm | Trạng thái |
|---|---|---|---|
| F-01 | Đăng ký / đăng nhập bằng email + mật khẩu, JWT auth | `auth-service` | ✅ Hoàn thành |
| F-02 | 3 vai trò: Admin / Teacher / Student | `auth-service` | ✅ Hoàn thành |
| F-03 | Luyện thi Reading (tạo đề, nộp bài, chấm điểm tự động) | `reading-service` | ✅ Hoàn thành |
| F-04 | Luyện thi Listening (full test + từng part, dictation) | `listening-service` | ✅ Hoàn thành |
| F-05 | Luyện thi Writing Task 1 & Task 2 (Teacher chấm thủ công) | `writing-service` | ✅ Hoàn thành |
| F-06 | AI feedback bổ sung cho bài Writing (Gemini + prompt template) | `ai-service` + `writing-service` | ✅ Hoàn thành |
| F-07 | Luyện thi Speaking (nộp bài nói, Teacher chấm) | `speaking-service` | ✅ Hoàn thành |
| F-08 | Mock exam 4 kỹ năng tích hợp (nhập đề từ PDF qua SSE) | `exam-service` | ✅ Hoàn thành |
| F-09 | Hệ thống gói dịch vụ FREE / PLUS / PRO + kiểm soát quyền truy cập skill | `billing-service` | ✅ Hoàn thành |
| F-10 | Thanh toán VietQR — tạo QR, Admin duyệt giao dịch | `payment-service` | ✅ Hoàn thành |
| F-11 | Thông báo real-time qua RabbitMQ | `notification-service` | ✅ Hoàn thành |
| F-12 | Quản lý Gemini API key pool + prompt template qua Admin UI | `auth-service` + Frontend AIManager | ✅ Hoàn thành |
| F-13 | Lesson service (tài liệu học tập) | `lesson-service` | ✅ Hoàn thành |
| F-14 | Dashboard học sinh, giáo viên, admin | Frontend | ✅ Hoàn thành |

### NGOÀI PHẠM VI — Dời sang v1.1+

| Tính năng bị hoãn | Lý do hoãn | Phiên bản dự kiến |
|---|---|---|
| AI Speaking Examiner tự động hỏi follow-up | Cần STT pipeline + adaptive logic | v1.1 |
| AI tự chấm Writing không cần Teacher (end-to-end) | Cần xây dựng trust baseline với human-graded data trước | v1.1 |
| Trend chart theo từng tiêu chí TR/CC/LR/GRA qua nhiều lần nộp bài | Frontend chưa có aggregation API | v1.1 |
| Confidence score trên kết quả AI | Chưa có trường `confidence_pct` trong schema | v1.1 |
| Readiness Index cho ngày thi thật | Cần tích hợp dữ liệu từ nhiều kỹ năng | v1.2 |
| Mobile native app | Ưu tiên web-first | v2.0 |
| Peer review / leaderboard | Cần moderation layer | v2.0 |

---

## G. USER STORIES

### Xác thực & Tài khoản

| ID | User Story |
|---|---|
| US-01 | Là **khách truy cập mới**, tôi muốn đăng ký bằng email và mật khẩu để có tài khoản theo dõi lịch sử học tập. |
| US-02 | Là **người dùng quay lại**, tôi muốn đăng nhập và được giữ phiên đăng nhập (localStorage token) để không phải nhập lại thông tin. |
| US-03 | Là **học sinh**, tôi muốn đổi mật khẩu từ trang hồ sơ để bảo vệ tài khoản. |
| US-04 | Là **Admin**, tôi muốn thay đổi vai trò của người dùng (Student → Teacher) để phân quyền đúng. |

### Luyện tập Writing

| ID | User Story |
|---|---|
| US-05 | Là **học sinh**, tôi muốn chọn một đề Writing Task 2 và nộp bài viết để nhận phản hồi từ giáo viên. |
| US-06 | Là **học sinh**, tôi muốn thấy điểm theo từng tiêu chí (TR, CC, LR, GRA) chứ không chỉ điểm tổng. |
| US-07 | Là **học sinh**, tôi muốn đọc phản hồi AI bổ sung sau khi bài đã được giáo viên chấm để hiểu sâu hơn về lỗi. |
| US-08 | Là **giáo viên**, tôi muốn thấy danh sách bài đang chờ chấm (status: Pending) để xử lý theo thứ tự. |
| US-09 | Là **giáo viên**, tôi muốn nhập điểm TR/CC/LR/GRA và nhận xét bằng văn bản cho từng bài để học sinh hiểu lý do mất điểm. |
| US-10 | Là **giáo viên**, tôi muốn gắn thêm AI feedback vào bài đã chấm (PATCH) để làm phong phú nhận xét. |

### Luyện tập Listening & Reading

| ID | User Story |
|---|---|
| US-11 | Là **học sinh**, tôi muốn nộp câu trả lời cho đề Listening và nhận điểm tự động ngay lập tức. |
| US-12 | Là **học sinh**, tôi muốn luyện dictation để cải thiện kỹ năng nghe và viết đồng thời. |
| US-13 | Là **học sinh**, tôi muốn xem lại lịch sử các lần làm bài (`my-attempts`) để theo dõi điểm qua thời gian. |

### Mock Exam

| ID | User Story |
|---|---|
| US-14 | Là **học sinh**, tôi muốn làm bài thi thử đầy đủ 4 kỹ năng trong một phiên thi để mô phỏng điều kiện thi thật. |
| US-15 | Là **giáo viên**, tôi muốn nhập đề thi từ file PDF (Writing + Speaking) và hệ thống tự phân tích nội dung qua AI để giảm công tạo đề. |
| US-16 | Là **giáo viên**, tôi muốn xem bảng theo dõi (`monitoring`) tất cả bài thi đang diễn ra của học sinh. |

### Gói dịch vụ & Thanh toán

| ID | User Story |
|---|---|
| US-17 | Là **học sinh**, tôi muốn xem các gói FREE / PLUS / PRO và biết rõ từng gói mở kỹ năng gì để chọn phù hợp. |
| US-18 | Là **học sinh**, tôi muốn tạo QR thanh toán VietQR để nâng cấp gói mà không rời khỏi nền tảng. |
| US-19 | Là **Admin**, tôi muốn duyệt hoặc từ chối giao dịch thanh toán và tự động kích hoạt subscription cho người dùng. |

### Quản lý AI (Admin)

| ID | User Story |
|---|---|
| US-20 | Là **Admin**, tôi muốn thêm nhiều Gemini API key vào pool để hệ thống tự rotate khi key nào đó hết quota. |
| US-21 | Là **Admin**, tôi muốn chỉnh sửa prompt template cho từng kỹ năng (Writing, Speaking, Reading, Listening) qua giao diện, không cần sửa code. |

---

## H. YÊU CẦU CHỨC NĂNG

| ID | Yêu cầu | Ưu tiên | Service chịu trách nhiệm |
|---|---|---|---|
| FR-01 | Hệ thống cho phép đăng ký bằng email + mật khẩu; mật khẩu được hash bằng bcrypt (salt rounds = 10) | Bắt buộc | `auth-service` |
| FR-02 | Hệ thống phát JWT (HS256) sau khi đăng nhập thành công; token lưu trong localStorage phía client | Bắt buộc | `auth-service` |
| FR-03 | Hệ thống phân quyền theo 3 vai trò: `Admin`, `Teacher`, `Student`; middleware `authorizeRoles` bảo vệ route | Bắt buộc | `auth-service` |
| FR-04 | Học sinh nộp bài Writing (Task 1 hoặc Task 2); hệ thống lưu `content`, `wordCount`, `taskType`, `status: Pending` | Bắt buộc | `writing-service` |
| FR-05 | Giáo viên chấm bài Writing thủ công: nhập điểm TR/CC/LR/GRA, `teacherFeedback.content`, `overallBand`; bài chuyển sang `Graded` | Bắt buộc | `writing-service` |
| FR-06 | Giáo viên gắn AI feedback (PATCH `/:id/ai-feedback`) vào bài đã chấm; `aiFeedback` được lưu dạng `Mixed` JSON | Bắt buộc | `writing-service` + `ai-service` |
| FR-07 | AI service gọi Google Gemini với prompt template lấy từ `SystemConfig` trong `auth-service` | Bắt buộc | `ai-service` |
| FR-08 | AI service quản lý pool Gemini API key: lấy key `ACTIVE`, tự rotate khi nhận lỗi 429/quota exhausted | Bắt buộc | `ai-service` + `auth-service` |
| FR-09 | Học sinh nộp bài Listening theo part hoặc full test; hệ thống chấm tự động, lưu `AttemptResult` | Bắt buộc | `listening-service` |
| FR-10 | Hệ thống hỗ trợ bài tập dictation (Listening): so khớp câu trả lời sau khi normalize (viết tắt, giới từ, ký tự thừa) | Bắt buộc | `listening-service` |
| FR-11 | Exam service hỗ trợ mock exam 4 kỹ năng; học sinh start exam → start từng skill → submit từng skill → submit toàn bộ | Bắt buộc | `exam-service` |
| FR-12 | Exam service hỗ trợ nhập đề từ PDF (`orchestrate-pdf`); AI phân tích PDF và tạo cấu trúc đề thi, tiến trình qua SSE | Bắt buộc | `exam-service` + `ai-service` |
| FR-13 | Billing service kiểm tra `user.plan` → tra `Plan.benefits.skills` → từ chối 403 nếu kỹ năng không được phép (`requireSkill` middleware) | Bắt buộc | `billing-service` |
| FR-14 | Payment service tạo link VietQR; học sinh thanh toán ngoài băng tần; Admin duyệt → `activateSubscriptionInternal` kích hoạt subscription | Bắt buộc | `payment-service` + `billing-service` |
| FR-15 | Notification service nhận event từ RabbitMQ, gửi email thông báo (đăng ký thành công, subscription được kích hoạt, v.v.) | Bắt buộc | `notification-service` |
| FR-16 | Admin quản lý ApiKey pool: thêm, xem trạng thái (ACTIVE/AVAILABLE/EXHAUSTED), trigger reset quota | Bắt buộc | `auth-service` (AIManager) |
| FR-17 | Admin chỉnh sửa prompt template (writingGradingPrompt, speakingGradingPrompt, ...) qua UI mà không cần redeploy | Bắt buộc | `auth-service` (SystemConfig) |
| FR-18 | Học sinh xem lịch sử nộp bài Writing (`/my-submissions`); Giáo viên xem pending/graded submissions | Bắt buộc | `writing-service` |
| FR-19 | Media service lưu trữ file âm thanh Speaking, file PDF đề thi | Nên có | `cloud-media-service` |
| FR-20 | Hệ thống snapshot câu trả lời trong quá trình thi mock (auto-save, tránh mất dữ liệu khi reload) | Nên có | `exam-service` |

---

## I. YÊU CẦU PHI CHỨC NĂNG

### Hiệu năng

| ID | Yêu cầu | Mục tiêu |
|---|---|---|
| NFR-P01 | Thời gian phản hồi AI (p95) cho Writing feedback | < 30 giây |
| NFR-P02 | Thời gian phản hồi AI (p50) | < 15 giây |
| NFR-P03 | Thời gian phản hồi các endpoint không-AI (p95) | < 500 ms |
| NFR-P04 | Thời gian tương tác đầu tiên (TTI) Frontend trên 4G | < 3 giây |
| NFR-P05 | Xử lý đồng thời tối thiểu (AI scoring) | 20 yêu cầu song song |

### Bảo mật

| ID | Yêu cầu |
|---|---|
| NFR-S01 | Không có Gemini API key nào xuất hiện trong bundle frontend hoặc response từ client-facing endpoint |
| NFR-S02 | Mật khẩu lưu bằng bcrypt (salt rounds = 10); không lưu plaintext |
| NFR-S03 | JWT token lưu trong localStorage; các route nhạy cảm phải qua middleware `verifyToken` |
| NFR-S04 | Tất cả input người dùng (bài viết, câu trả lời) phải được sanitize trước khi lưu vào DB |
| NFR-S05 | Internal endpoint (`/internal/*`) chỉ được gọi bởi service nội bộ; bảo vệ bằng header `x-internal-secret` |
| NFR-S06 | Prompt template của AI được tham số hóa (essay text được inject như dữ liệu, không nối trực tiếp vào instruction) để ngăn prompt injection |
| NFR-S07 | API Gateway không thêm `express.json()` parser toàn cục để tránh body bị mất khi proxy; parsing thực hiện tại từng service |

### Độ tin cậy & Vận hành

| ID | Yêu cầu |
|---|---|
| NFR-R01 | AI service tự động rotate API key khi nhận lỗi quota exhausted (ACTIVE → EXHAUSTED → next AVAILABLE) |
| NFR-R02 | Tất cả service expose endpoint `GET /health` trả về status và tên service |
| NFR-R03 | Docker Compose cấu hình `restart: unless-stopped` cho toàn bộ service |
| NFR-R04 | RabbitMQ dùng cho async messaging giữa payment-service, notification-service, billing-service; không dùng gọi đồng bộ chéo service cho luồng thanh toán |
| NFR-R05 | Uptime mục tiêu cho các endpoint không-AI: 99.5%/tháng |

### UX & Khả năng tiếp cận

| ID | Yêu cầu |
|---|---|
| NFR-U01 | Trang kết quả chấm bài hiển thị điểm theo tiêu chí và nhận xét trong một màn hình, không cần scroll ngang |
| NFR-U02 | Thông báo lỗi dùng ngôn ngữ tự nhiên, không hiển thị HTTP status code thô cho người dùng cuối |
| NFR-U03 | Trang danh sách gói dịch vụ hiển thị rõ kỹ năng nào được phép trước khi người dùng mua |
| NFR-U04 | Tiến trình nhập đề PDF (orchestrate-pdf) hiển thị qua SSE để người dùng biết hệ thống đang xử lý |

---

## J. LUỒNG NGƯỜI DÙNG CỐT LÕI

### Luồng 1: Học sinh luyện Writing

```
Trang chủ (HomePage)
    │ Chọn "Writing"
    ▼
Danh sách đề Writing (WritingListPage)
    │ Chọn đề → GET /api/writing/:id
    ▼
Trang làm bài (WritingExamPage)
    │ Nhập bài viết → POST /api/writing/submissions
    │ { writingId, taskType, content, wordCount }
    ▼
Bài được lưu với status: "Pending"
    │ (Giáo viên nhận thông báo)
    ▼
Giáo viên vào GradingDashboard
    │ GET /api/writing/submissions/pending
    │ Nhập TR, CC, LR, GRA + teacherFeedback
    │ PUT /api/writing/submissions/:id/grade
    ▼
Bài chuyển sang status: "Graded"
    │ (Giáo viên tuỳ chọn gắn AI feedback)
    │ PATCH /api/writing/submissions/:id/ai-feedback
    ▼
Học sinh xem kết quả (History → DetailHistory)
    │ GET /api/writing/submissions/my-submissions
    │ Thấy: điểm TR/CC/LR/GRA + teacherFeedback + aiFeedback
    ▼
Học sinh nhìn lại pattern lỗi → luyện lại
```

### Luồng 2: Admin quản lý AI

```
Admin → AIManager (Frontend)
    │
    ├── Thêm Gemini API key → POST /api/auth/api-keys
    │   { keyString, label } → status: AVAILABLE
    │
    ├── Xem trạng thái pool (ACTIVE/AVAILABLE/EXHAUSTED)
    │   GET /api/auth/api-keys
    │
    ├── Chỉnh prompt Writing/Speaking
    │   PUT /api/auth/system-config
    │   { writingGradingPrompt: "...", speakingGradingPrompt: "..." }
    │
    └── AI service đọc prompt mỗi lần gọi
        GET /api/internal/system-config (x-internal-secret)
```

### Luồng 3: Thanh toán & Kích hoạt gói

```
Học sinh → Trang gói dịch vụ
    │ GET /api/billing/plans
    │ Chọn gói PLUS / PRO
    ▼
Tạo thanh toán VietQR
    │ POST /api/payment/create
    │ → { qrCode, transactionId, amount }
    ▼
Học sinh chuyển khoản ngân hàng
    ▼
Admin → TransactionManagement
    │ GET /api/payment/transactions
    │ Xác nhận chuyển khoản thực → PUT /api/payment/transactions/:id/approve
    ▼
payment-service → billing-service
    │ POST /api/billing/internal/subscriptions/activate
    │ → Tạo Subscription record (ACTIVE, validUntil)
    ▼
billing-service → auth-service
    │ PATCH /internal/users/:id/subscription
    │ → Cập nhật user.plan = 'PLUS' | 'PRO'
    ▼
notification-service gửi email xác nhận
    │ (qua RabbitMQ event)
    ▼
Học sinh refresh → requireSkill middleware cho phép truy cập kỹ năng mới
```

### Luồng 4: Mock Exam

```
Học sinh → MockExamDashboard
    │ GET /api/exams
    ▼
Chọn đề thi → POST /api/exams/:examId/start
    │ → Tạo ExamAttempt
    ▼
Làm từng kỹ năng:
    POST /api/attempts/:attemptId/skills/:skillType/start
    PUT  /api/attempts/:attemptId/skills/:skillType/snapshot  (auto-save)
    POST /api/attempts/:attemptId/skills/:skillType/submit
    ▼
Nộp toàn bộ → POST /api/attempts/:attemptId/submit
    ▼
Reading/Listening → chấm tự động
Writing/Speaking → chờ Teacher chấm
    (Teacher: GET /api/teacher/monitoring/attempts)
    (Teacher: POST /api/teacher/attempts/:attemptId/grade)
```

---

## K. MÔ HÌNH DỮ LIỆU

### Collection `users` (`auth-service` — MongoDB)

| Trường | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `_id` | ObjectId | PK | Auto-generated |
| `email` | String | unique, required, lowercase | |
| `password` | String | required | bcrypt hash, không bao giờ trả về |
| `name` | String | trim | Tên hiển thị |
| `role` | String enum | `Admin` \| `Teacher` \| `Student` | Default: `Student` |
| `isActive` | Boolean | default: true | Admin có thể deactivate |
| `plan` | String enum | `FREE` \| `PLUS` \| `PRO` | Đồng bộ từ billing-service |
| `vipValidUntil` | Date | default: null | Ngày hết hạn gói trả phí |
| `avatar` | String | auto-generate từ tên | URL ui-avatars.com |
| `createdAt` | Date | timestamps | |
| `updatedAt` | Date | timestamps | |

### Collection `writingsubmissions` (`writing-service` — MongoDB)

| Trường | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `_id` | ObjectId | PK | |
| `studentId` | ObjectId | ref: User, required, index | |
| `writingId` | ObjectId | ref: Writing, required, index | Đề thi được chọn |
| `taskType` | String enum | `Task 1` \| `Task 2` | |
| `content` | String | required, trim | Nội dung bài viết |
| `wordCount` | Number | required, min: 0 | Đếm phía client |
| `status` | String enum | `Pending` \| `Graded` | Default: `Pending`, index |
| `grading.criteria.TR` | Number | 0–9 | Task Response |
| `grading.criteria.CC` | Number | 0–9 | Coherence & Cohesion |
| `grading.criteria.LR` | Number | 0–9 | Lexical Resource |
| `grading.criteria.GRA` | Number | 0–9 | Grammatical Range & Accuracy |
| `grading.overallBand` | Number | 0–9 | Tính trung bình 4 tiêu chí |
| `grading.teacherFeedback.content` | String | | Nhận xét inline của GV |
| `grading.teacherFeedback.overall_feedback` | String | | Nhận xét tổng quan của GV |
| `grading.aiFeedback` | Mixed | | JSON tự do từ Gemini |
| `grading.gradedBy` | ObjectId | ref: User | Teacher chấm |
| `grading.gradedAt` | Date | | Thời điểm chấm |
| `createdAt` | Date | timestamps | |

### Collection `plans` (`billing-service` — MongoDB)

| Trường | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `_id` | ObjectId | PK | |
| `code` | String | unique, required | `FREE`, `PLUS`, `PRO` |
| `name` | String | required | Tên hiển thị |
| `price` | Number | required | VND |
| `isActive` | Boolean | default: true | Ẩn/hiện gói |
| `durationMonths` | Number | required | Thời hạn (1, 3, 6, 12) |
| `features` | [String] | | Mô tả tính năng hiển thị |
| `benefits.skills` | [String enum] | `reading` \| `listening` \| `writing` \| `speaking` | Kỹ năng được mở |
| `benefits.maxHours` | Number | default: -1 | -1 = không giới hạn |
| `benefits.maxFullTests` | Number | default: 0 | -1 = không giới hạn |
| `ui.borderColor` | String | | CSS color |
| `ui.buttonText` | String | | Text nút mua |
| `ui.badge` | String | | Nhãn nổi bật |

### Collection `subscriptions` (`billing-service` — MongoDB)

| Trường | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `_id` | ObjectId | PK | |
| `userId` | ObjectId | unique, required | Ref sang auth-service |
| `planId` | ObjectId | ref: Plan, required | |
| `status` | String enum | `ACTIVE` \| `EXPIRED` \| `CANCELLED` | Default: `ACTIVE` |
| `fullTestUsed` | Number | default: 0 | Số lượt mock exam đã dùng |
| `validUntil` | Date | required | Ngày hết hạn |
| `cancelledAt` | Date | default: null | |
| `cancellationReason` | String enum | `POLICY_VIOLATION` \| `SYSTEM_ERROR` \| `USER_REQUEST_REFUND` \| null | |

### Collection `apikeys` (`auth-service` — MongoDB)

| Trường | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `_id` | ObjectId | PK | |
| `keyString` | String | unique, required, select: false | Không trả về mặc định |
| `label` | String | | Nhãn nhận dạng |
| `status` | String enum | `ACTIVE` \| `AVAILABLE` \| `EXHAUSTED` | Index |
| `usageCount` | Number | default: 0 | Đếm số lần gọi |
| `lastUsedAt` | Date | default: null | |
| `exhaustedAt` | Date | default: null | |

### `SystemConfig` (singleton document trong `auth-service`)

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `key` | String | Luôn là `'global'`, immutable |
| `writingGradingPrompt` | String | Prompt chấm bài Writing, Admin chỉnh qua UI |
| `speakingGradingPrompt` | String | Prompt chấm bài Speaking |
| `readingPromptTemplate` | String | Prompt cho ảnh/scan Reading |
| `listeningPromptTemplate` | String | Prompt cho ảnh/scan Listening |
| `writingExtractPrompt` | String | Prompt trích xuất đề Writing từ PDF |
| `speakingExtractPrompt` | String | Prompt trích xuất đề Speaking từ PDF |
| `monthlyTokenQuota` | Number | Ngưỡng token/tháng (default: 1,000,000) |
| `monthlyTokensUsed` | Number | Đã tiêu thụ trong tháng hiện tại |
| `quotaResetMonth` | String | Format `YYYY-MM` |

---

## L. YÊU CẦU API

### `auth-service` (proxy qua `/api/auth/*`)

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Đăng ký; body: `{ name, email, password }` |
| POST | `/api/auth/login` | Public | Đăng nhập; trả về `{ token, user }` |
| GET | `/api/auth/profile` | Bearer JWT | Lấy thông tin tài khoản đang đăng nhập |
| PUT | `/api/auth/profile` | Bearer JWT | Cập nhật tên, avatar |
| PUT | `/api/auth/change-password` | Bearer JWT | Đổi mật khẩu |
| PUT | `/api/auth/update-role/:id` | Admin | Phân vai trò cho user |
| POST | `/api/auth/internal/users/batch` | Internal secret | Lấy thông tin nhiều user theo ID (API composition) |
| PATCH | `/api/auth/internal/users/:id/subscription` | Internal secret | Cập nhật `user.plan` sau khi billing kích hoạt |
| GET | `/api/internal/system-config` | Internal secret | AI service lấy config + prompt template |
| GET | `/api/internal/api-keys/active` | Internal secret | AI service lấy key đang ACTIVE |
| POST | `/api/internal/api-keys/rotate` | Internal secret | AI service rotate key khi quota exhausted |

### `writing-service` (proxy qua `/api/writing/*`)

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/writing/items` | Public | Danh sách đề (không có đáp án) |
| GET | `/api/writing/items/:id` | Public | Chi tiết một đề |
| POST | `/api/writing/submissions` | Student JWT | Nộp bài; body: `{ writingId, taskType, content, wordCount }` |
| GET | `/api/writing/submissions/my-submissions` | Student JWT | Lịch sử bài đã nộp |
| GET | `/api/writing/submissions/pending` | Teacher/Admin JWT | Danh sách bài chờ chấm |
| GET | `/api/writing/submissions/graded` | Teacher/Admin JWT | Danh sách bài đã chấm |
| PUT | `/api/writing/submissions/:id/grade` | Teacher/Admin JWT | Chấm bài; body: `{ criteria, overallBand, teacherFeedback }` |
| PATCH | `/api/writing/submissions/:id/ai-feedback` | Teacher/Admin JWT | Gắn AI feedback; body: `{ aiFeedback }` |

### `listening-service` (proxy qua `/api/listening/*` và `/api/dictation/*`)

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/listening/` | Public | Danh sách đề Listening |
| GET | `/api/listening/:id` | Public | Chi tiết đề (ẩn đáp án) |
| POST | `/api/listening/:id/submit` | Student JWT | Nộp toàn bộ bài |
| POST | `/api/listening/:id/submit-part` | Student JWT | Nộp từng part |
| GET | `/api/listening/my-attempts` | Student JWT | Lịch sử làm bài |
| GET | `/api/listening/attempts` | Teacher/Admin JWT | Tất cả kết quả |

### `billing-service` (proxy qua `/api/billing/*`)

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/billing/plans` | Public | Danh sách gói dịch vụ hiển thị |
| GET | `/api/billing/my-subscription` | Student JWT | Subscription hiện tại của user |
| GET | `/api/billing/my-skills` | Student JWT | Danh sách skill được phép |
| GET | `/api/billing/skill-check/:skillName` | Student JWT | Kiểm tra quyền truy cập 1 skill |
| POST | `/api/billing/internal/subscriptions/activate` | Internal | Kích hoạt subscription sau thanh toán |

### `payment-service` (proxy qua `/api/payment/*`)

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| POST | `/api/payment/create` | Student JWT | Tạo QR VietQR; body: `{ planId }` |
| GET | `/api/payment/transactions/my-pending` | Student JWT | Giao dịch chờ duyệt của tôi |
| GET | `/api/payment/transactions` | JWT | Tất cả giao dịch (Admin xem tất cả) |
| PUT | `/api/payment/transactions/:id/approve` | Admin JWT | Duyệt giao dịch → kích hoạt sub |
| PUT | `/api/payment/transactions/:id/reject` | Admin JWT | Từ chối giao dịch |

### `exam-service` (proxy qua `/api/exams/*` và `/api/attempts/*`)

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/exams/exams` | Student/Teacher/Admin | Danh sách đề thi published |
| POST | `/api/exams/exams/:examId/start` | Student/Teacher/Admin | Bắt đầu thi; tạo ExamAttempt |
| GET | `/api/exams/attempts/:attemptId` | Student/Teacher/Admin | Trạng thái attempt |
| POST | `/api/exams/attempts/:attemptId/skills/:skillType/start` | Student/Teacher/Admin | Bắt đầu kỹ năng |
| PUT | `/api/exams/attempts/:attemptId/skills/:skillType/snapshot` | Student/Teacher/Admin | Auto-save câu trả lời |
| POST | `/api/exams/attempts/:attemptId/skills/:skillType/submit` | Student/Teacher/Admin | Nộp kỹ năng |
| POST | `/api/exams/attempts/:attemptId/submit` | Student/Teacher/Admin | Nộp toàn bộ bài thi |
| POST | `/api/exams/teacher/exams/orchestrate-pdf` | Teacher/Admin | Upload PDF, AI phân tích, SSE progress |
| GET | `/api/exams/teacher/exams/orchestrate-progress/:jobId` | Teacher/Admin | SSE stream tiến trình phân tích PDF |
| POST | `/api/exams/teacher/attempts/:attemptId/grade` | Teacher/Admin | Chấm Writing/Speaking trong mock exam |

### `ai-service` (proxy qua `/api/ai/*` — FastAPI Python)

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| POST | `/api/ai/grade-writing` | Internal/Teacher JWT | Gemini chấm bài Writing; body: `{ content, taskType, prompt? }` |
| POST | `/api/ai/grade-speaking` | Internal/Teacher JWT | Gemini chấm bài Speaking |
| POST | `/api/ai/extract-writing` | Teacher JWT | Trích xuất cấu trúc đề từ ảnh/PDF Writing |
| POST | `/api/ai/extract-speaking` | Teacher JWT | Trích xuất cấu trúc đề từ ảnh/PDF Speaking |

---

## M. YÊU CẦU PROMPT AI

### Đặc tả Engine

| Thông số | Giá trị thực tế |
|---|---|
| **Model** | `gemini-2.5-flash-preview-04-17` (cấu hình qua biến môi trường `GEMINI_MODEL`) |
| **Provider** | Google Gemini API |
| **Vị trí API key** | MongoDB `ApiKey` collection trong `auth-service`; `ai-service` gọi nội bộ để lấy key |
| **Quản lý key** | Pool nhiều key: ACTIVE → EXHAUSTED → rotate sang AVAILABLE tiếp theo |
| **Lưu trữ prompt** | `SystemConfig` trong MongoDB; Admin chỉnh qua UI AIManager |

### Cơ chế lấy prompt và key (luồng thực tế trong `main.py`)

```python
# 1. Lấy config (prompt templates) từ auth-service
config = await _fetch_ai_config()
# → GET http://auth-service:3001/api/internal/system-config
# → Headers: { x-internal-secret: INTERNAL_SECRET }

# 2. Lấy API key đang ACTIVE
key_info = await _fetch_active_key()
# → GET http://auth-service:3001/api/internal/api-keys/active

# 3. Gọi Gemini với prompt từ config
client = genai.Client(api_key=key_info["keyString"])
response = await client.models.generate_content(
    model=GEMINI_MODEL,
    contents=[prompt_with_essay]
)

# 4. Nếu gặp lỗi quota → rotate key
if "quota" in str(error).lower():
    key_info = await _rotate_key(key_info["keyId"])
    # → POST http://auth-service:3001/api/internal/api-keys/rotate
```

### Cấu trúc Prompt chấm bài Writing (mẫu lưu trong `SystemConfig.writingGradingPrompt`)

```
Bạn là một giám khảo IELTS được chứng nhận. Hãy chấm bài Writing dưới đây
theo đúng 4 tiêu chí rubric chính thức của IELTS:

1. Task Response (TR)
2. Coherence and Cohesion (CC)
3. Lexical Resource (LR)
4. Grammatical Range and Accuracy (GRA)

Loại bài: {{taskType}}
Đề bài: {{prompt}}

Bài viết của học sinh:
{{essayContent}}

Số từ: {{wordCount}}

Yêu cầu đầu ra (JSON):
{
  "criteria": {
    "TR": <số 0-9, bước 0.5>,
    "CC": <số 0-9, bước 0.5>,
    "LR": <số 0-9, bước 0.5>,
    "GRA": <số 0-9, bước 0.5>
  },
  "overallBand": <trung bình 4 tiêu chí, làm tròn đến 0.5>,
  "detailed_feedback": {
    "TR": "<nhận xét cụ thể>",
    "CC": "<nhận xét cụ thể>",
    "LR": "<nhận xét cụ thể>",
    "GRA": "<nhận xét cụ thể>"
  },
  "priority_fixes": [
    { "rank": 1, "criterion": "TR|CC|LR|GRA", "action": "<việc cần làm cụ thể>" },
    { "rank": 2, ... },
    { "rank": 3, ... }
  ],
  "overall_comment": "<nhận xét tổng quan bằng tiếng Việt>"
}

Chỉ trả về JSON hợp lệ, không có văn bản bên ngoài JSON.
```

### Guardrails bảo mật prompt

| Rủi ro | Biện pháp giảm thiểu |
|---|---|
| **Prompt injection** qua nội dung bài viết | Essay được inject như dữ liệu được đặt trong block có dấu phân cách rõ ràng; không nối chuỗi trực tiếp vào instruction |
| **Tham số hóa** | Template sử dụng placeholder `{{variable}}` — không dùng f-string nối thẳng |
| **Inflate điểm** | System instruction yêu cầu model chấm khách quan; temperature thấp |
| **Output không phải JSON** | `ai-service` parse với try/except; nếu lỗi → retry 1 lần với explicit JSON instruction |
| **API key lộ** | `keyString` field trong MongoDB dùng `select: false`; chỉ `ai-service` gọi được qua internal endpoint |
| **Quota exhausted** | Tự động rotate trong `_rotate_key()`; trả 503 kèm message rõ ràng nếu hết toàn bộ key |

---

## N. TIÊU CHÍ CHẤP NHẬN (Acceptance Criteria)

### AC-01: Đăng ký tài khoản

```
Given: Người dùng gửi email hợp lệ và mật khẩu >= 6 ký tự
When:  POST /api/auth/register được gọi
Then:
  - Response 201 có chứa { message, token, user: { id, name, email, role: 'Student', plan: 'FREE' } }
  - Mật khẩu KHÔNG trả về trong response
  - Bản ghi User được lưu vào MongoDB với password là bcrypt hash
  - user.plan = 'FREE', user.role = 'Student' theo mặc định
  - Notification service nhận event và gửi email chào mừng
```

### AC-02: Học sinh nộp bài Writing

```
Given: Học sinh đã đăng nhập, chọn đề Writing Task 2
When:  POST /api/writing/submissions với { writingId, taskType: 'Task 2', content, wordCount }
Then:
  - Response 201 với submissionId
  - WritingSubmission được lưu với status: 'Pending'
  - studentId trùng với user đang đăng nhập
  - Bài xuất hiện trong GET /api/writing/submissions/pending của Teacher
```

### AC-03: Giáo viên chấm bài Writing

```
Given: Có bài Writing với status: 'Pending'
When:  PUT /api/writing/submissions/:id/grade với:
       { criteria: { TR: 6.5, CC: 7, LR: 6, GRA: 7 },
         overallBand: 6.5,
         teacherFeedback: { content: '...', overall_feedback: '...' },
         gradedBy: teacherId, gradedAt: now }
Then:
  - Response 200 với bài đã cập nhật
  - status chuyển thành 'Graded'
  - grading.criteria có đủ TR, CC, LR, GRA
  - Bài xuất hiện trong GET /api/writing/submissions/my-submissions của học sinh
  - Điểm từng tiêu chí hiển thị đúng trên trang lịch sử học sinh
```

### AC-04: Rotate Gemini API key khi hết quota

```
Given: Key đang ACTIVE nhận phản hồi lỗi quota exhausted từ Gemini
When:  ai-service xử lý lỗi
Then:
  - POST /api/internal/api-keys/rotate được gọi với { exhaustedKeyId }
  - Key cũ chuyển sang status: 'EXHAUSTED', exhaustedAt được ghi
  - Key AVAILABLE kế tiếp (theo thứ tự) chuyển sang ACTIVE
  - Request hiện tại được retry với key mới
  - Nếu không còn key AVAILABLE → trả 503 với message rõ ràng
```

### AC-05: Kiểm soát quyền truy cập skill

```
Given: Học sinh có plan = 'FREE'; gói FREE không có skill 'writing' trong benefits.skills
When:  Học sinh gọi POST /api/writing/submissions
Then:
  - requireSkill('writing') middleware chặn request
  - Response 403 với message hướng dẫn nâng cấp gói
  - Không có bản ghi nào được tạo trong DB
```

### AC-06: Thanh toán VietQR và kích hoạt gói

```
Given: Học sinh chọn gói PLUS (3 tháng)
When:  POST /api/payment/create → chuyển khoản thực tế → Admin PUT /api/payment/transactions/:id/approve
Then:
  - payment-service gọi billing-service POST /internal/subscriptions/activate
  - Subscription record được tạo với status: 'ACTIVE', validUntil = now + 3 tháng
  - billing-service gọi auth-service PATCH /internal/users/:id/subscription → user.plan = 'PLUS'
  - Học sinh gọi lại GET /api/billing/my-skills → thấy 'writing' trong danh sách
  - Email xác nhận được gửi qua notification-service
```

### AC-07: Nhập đề thi từ PDF

```
Given: Giáo viên upload file PDF chứa đề Writing Task 1 và Task 2
When:  POST /api/exams/teacher/exams/orchestrate-pdf với file PDF
Then:
  - Response 200 với { jobId }
  - SSE endpoint GET /api/exams/teacher/exams/orchestrate-progress/:jobId phát event progress
  - ai-service trích xuất cấu trúc đề từ PDF sử dụng writingExtractPrompt
  - Exam record được tạo với nội dung đề đã phân tích
  - SSE phát event 'complete' khi hoàn thành
```

### AC-08: API key không lộ phía client

```
Given: Frontend bundle đã được build (npm run build)
When:  Toàn bộ file .js trong dist/ được scan tìm pattern Gemini API key
Then:
  - Không tìm thấy chuỗi nào khớp pattern API key của Google (AIza...)
  - Tất cả request tới Gemini đều đi qua ai-service backend
  - keyString field MongoDB không bao giờ xuất hiện trong response JSON
```

---

## Phụ lục: Cấu trúc Port và Service Map

| Service | Port (host) | Port (container) | Tech Stack | Database |
|---|---|---|---|---|
| `api-gateway` | 3000 | 3000 | Express.js (proxy) | Redis |
| `auth-service` | 3001 | 3001 | Node.js + Express | MongoDB (ielts_auth_db) |
| `reading-service` | 3002 | 3002 | Node.js + Express | MongoDB (ielts_reading_db) |
| `listening-service` | 3003 | 3003 | Node.js + Express | MongoDB (ielts_listening_db) |
| `writing-service` | 3004 | 3004 | Node.js + Express | MongoDB (ielts_writing_db) |
| `billing-service` | 3005 | 3005 | Node.js + Express | MongoDB (ielts_billing_db) |
| `lesson-service` | 3007 | 3007 | Node.js + Express | MongoDB (ielts_lesson_db) |
| `speaking-service` | 3008 | 3008 | Node.js + Python | MongoDB (ielts_speaking_db) |
| `payment-service` | 3009 | 3009 | Node.js + Express | MongoDB (ielts_payment_db) |
| `cloud-media-service` | 3010 | 3010 | Node.js + Express | MongoDB (cloud storage) |
| `notification-service` | 3011 | 3011 | Node.js + Express | RabbitMQ |
| `ai-service` | 3012 | 3012 | Python + FastAPI | — (stateless) |
| `exam-service` | 3013 | 3013 | Node.js + Express | MongoDB (ielts_exam_db) |
| `rabbitmq` | 5672, 15672 | — | RabbitMQ 3 Alpine | — |
| `redis` | 6379 | — | Redis Alpine | — |

---

*Tài liệu này phản ánh trạng thái mã nguồn thực tế tính đến ngày 2026-05-15. Tất cả tên collection, tên trường, route, và port được lấy trực tiếp từ mã nguồn các service trong thư mục `ielts/be/`.*
