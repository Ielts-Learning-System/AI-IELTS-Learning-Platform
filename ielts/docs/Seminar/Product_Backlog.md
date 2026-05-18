# Product Backlog — IELTS-Mate
## Agile Scrum Master Document

| Trường | Chi tiết |
|---|---|
| **Phiên bản** | v1.0 |
| **Nguồn** | PRD v1.0 (2026-05-15) |
| **Sprint Framework** | Scrum — 2-week sprints |
| **Priority Scale** | 🔴 Must Have · 🟡 Should Have · 🟢 Nice to Have |

---

## Quy ước cột

| Cột | Ý nghĩa |
|---|---|
| **Story ID** | Mã định danh duy nhất |
| **Epic** | Nhóm tính năng lớn |
| **User Story** | As a [Persona], I want [Action] so that [Value] |
| **Acceptance Criteria** | Điều kiện "Done" — cụ thể, kiểm thử được |
| **Priority** | Mức độ ưu tiên |
| **Story Points** | Ước tính độ phức tạp (Fibonacci: 1, 2, 3, 5, 8, 13) |
| **Service** | Microservice chịu trách nhiệm |

---

## EPIC-01: Xác thực & Quản lý Tài khoản

| Story ID | Epic | User Story | Acceptance Criteria | Priority | SP | Service |
|---|---|---|---|---|---|---|
| US-01 | EPIC-01 | **Là khách truy cập mới**, tôi muốn đăng ký tài khoản bằng email và mật khẩu để có thể lưu lịch sử học tập. | 1. `POST /api/auth/register` trả về HTTP 201 với `{ token, user }` khi email hợp lệ và mật khẩu ≥ 6 ký tự. 2. Mật khẩu được lưu dưới dạng bcrypt hash — không bao giờ xuất hiện trong response. 3. `user.role` mặc định là `Student`, `user.plan` mặc định là `FREE`. 4. Nếu email đã tồn tại, trả về HTTP 409 với thông báo rõ ràng bằng ngôn ngữ tự nhiên. 5. Notification service gửi email chào mừng trong vòng 60 giây sau đăng ký. | 🔴 Must | 3 | `auth-service` |
| US-02 | EPIC-01 | **Là người dùng đã có tài khoản**, tôi muốn đăng nhập để truy cập lại lịch sử và tiếp tục học. | 1. `POST /api/auth/login` trả về HTTP 200 với `{ token, user }` khi email/password đúng. 2. JWT token được lưu vào `localStorage('accessToken')` và `user` vào `localStorage('user')`. 3. Sau khi đăng nhập, người dùng được giữ phiên khi F5 trang (rehydration từ localStorage). 4. Nếu email hoặc mật khẩu sai, trả về HTTP 401 — không tiết lộ email có tồn tại hay không. 5. `useUserStore.isAuthenticated` chuyển sang `true`; ProtectedRoute cho phép vào `/dashboard`. | 🔴 Must | 2 | `auth-service` |
| US-03 | EPIC-01 | **Là học sinh đã đăng nhập**, tôi muốn xem và cập nhật hồ sơ cá nhân (tên, avatar) để thông tin hiển thị đúng trên nền tảng. | 1. `GET /api/auth/profile` trả về `{ name, email, role, plan, avatar }` — không có `password`. 2. `PUT /api/auth/profile` với body `{ name }` cập nhật thành công và trả về user đã cập nhật. 3. Avatar tự động tạo từ chữ cái đầu tên qua `ui-avatars.com` nếu không upload ảnh. 4. Sau khi cập nhật, giao diện Dashboard hiển thị tên mới ngay lập tức (không cần logout/login lại). 5. Các trường `email` và `role` chỉ đọc — không thể sửa qua endpoint này. | 🟡 Should | 2 | `auth-service` |
| US-04 | EPIC-01 | **Là học sinh đã đăng nhập**, tôi muốn đổi mật khẩu từ trang cài đặt để bảo vệ tài khoản. | 1. `PUT /api/auth/change-password` yêu cầu `{ currentPassword, newPassword }`. 2. Nếu `currentPassword` sai, trả về HTTP 401. 3. Mật khẩu mới phải ≥ 6 ký tự; nếu không đạt trả về HTTP 400. 4. Sau khi đổi thành công, token hiện tại vẫn còn hiệu lực (không bị logout bắt buộc). 5. Mật khẩu mới được hash lại bằng bcrypt trước khi lưu. | 🟡 Should | 2 | `auth-service` |
| US-05 | EPIC-01 | **Là Admin**, tôi muốn thay đổi vai trò của người dùng (ví dụ: Student → Teacher) để phân quyền truy cập đúng. | 1. `PUT /api/auth/update-role/:id` chỉ hoạt động khi caller có `role = Admin` (HTTP 403 nếu không). 2. Giá trị `role` hợp lệ: `Admin`, `Teacher`, `Student`; giá trị khác trả về HTTP 400. 3. Sau khi cập nhật, người dùng được nâng cấp vai trò có quyền truy cập đúng trong lần đăng nhập tiếp theo. 4. Không thể hạ vai trò `Admin` xuống `Student` nếu chỉ còn 1 Admin trong hệ thống. 5. Thao tác được ghi log với `adminId` và `timestamp`. | 🟡 Should | 3 | `auth-service` |
| US-06 | EPIC-01 | **Là Admin**, tôi muốn xem danh sách tất cả người dùng và tìm kiếm theo email/tên để quản lý tài khoản. | 1. Endpoint trả về danh sách users hỗ trợ phân trang (`page`, `limit`). 2. Hỗ trợ filter theo `role` và search theo `email` (không phân biệt hoa thường). 3. Response không chứa trường `password` hoặc `keyString`. 4. Admin có thể toggle `isActive` để vô hiệu hóa tài khoản mà không xóa dữ liệu. 5. Người dùng bị `isActive: false` không thể đăng nhập (HTTP 403). | 🟡 Should | 5 | `auth-service` |

---

## EPIC-02: Luyện tập Writing (Hybrid Teacher + AI)

| Story ID | Epic | User Story | Acceptance Criteria | Priority | SP | Service |
|---|---|---|---|---|---|---|
| US-07 | EPIC-02 | **Là học sinh**, tôi muốn xem danh sách đề Writing được phân loại theo task type để chọn đề phù hợp trình độ. | 1. `GET /api/writing/items` trả về danh sách WritingItem với `taskType`, `title`, `topic`. 2. Đáp án mẫu (`sampleEssays`) không xuất hiện trong response danh sách. 3. Danh sách hỗ trợ filter theo `taskType` (`Task 1` / `Task 2`). 4. Mỗi item có trạng thái cho biết học sinh đã nộp bài cho đề đó chưa. 5. `requireSkill('writing')` middleware hoạt động — học sinh gói FREE truy cập trang thấy thông báo nâng cấp gói. | 🔴 Must | 3 | `writing-service` + `billing-service` |
| US-08 | EPIC-02 | **Là học sinh**, tôi muốn nhập bài viết và nộp cho đề Writing đã chọn để nhận phản hồi từ giáo viên. | 1. `POST /api/writing/submissions` chấp nhận `{ writingId, taskType, content, wordCount }` và trả về HTTP 201 với `submissionId`. 2. Bài được lưu với `status: Pending`; `studentId` trùng với user đang đăng nhập. 3. Nếu `wordCount < 50` trả về HTTP 400 với thông báo số từ cụ thể. 4. Bài mới xuất hiện ngay trong `GET /api/writing/submissions/my-submissions`. 5. Giáo viên thấy bài mới trong danh sách `pending` mà không cần refresh thủ công. | 🔴 Must | 3 | `writing-service` |
| US-09 | EPIC-02 | **Là học sinh**, tôi muốn xem điểm chi tiết theo từng tiêu chí (TR, CC, LR, GRA) sau khi bài được chấm để biết cụ thể mình đang yếu ở đâu. | 1. Sau khi giáo viên chấm, trang lịch sử hiển thị 4 điểm riêng biệt: `TR`, `CC`, `LR`, `GRA` và `overallBand`. 2. Mỗi tiêu chí hiển thị bằng thanh progress bar màu sắc khác nhau (không dựa chỉ vào màu). 3. `overallBand` bằng trung bình 4 tiêu chí, hiển thị đúng 1 chữ số thập phân. 4. Nhận xét giáo viên (`teacherFeedback.content` và `overall_feedback`) hiển thị đầy đủ bên dưới điểm. 5. Nếu bài đang `Pending`, UI hiển thị trạng thái chờ rõ ràng — không hiển thị block điểm trống. | 🔴 Must | 3 | `writing-service` (FE) |
| US-10 | EPIC-02 | **Là học sinh**, tôi muốn đọc phản hồi AI (aiFeedback) bổ sung sau khi bài đã được chấm để hiểu sâu hơn về lỗi ngôn ngữ. | 1. Khi `grading.aiFeedback` tồn tại, một section riêng "AI Feedback" hiển thị bên dưới nhận xét giáo viên. 2. Nội dung AI feedback được render dưới dạng Markdown (hỗ trợ bullet list, bold, code inline). 3. Nếu `aiFeedback` là `null`/`undefined`, section này ẩn hoàn toàn — không hiển thị placeholder trống. 4. Học sinh không thể tự kích hoạt AI feedback — chỉ hiển thị sau khi Teacher/Admin đã PATCH. 5. Thời gian hiển thị feedback không làm chậm load trang ban đầu (lazy-load section). | 🟡 Should | 3 | `writing-service` (FE) |
| US-11 | EPIC-02 | **Là giáo viên**, tôi muốn xem danh sách bài Writing đang chờ chấm để biết mình cần xử lý bài nào tiếp theo. | 1. `GET /api/writing/submissions/pending` chỉ trả về bài có `status: Pending`. 2. Mỗi item hiển thị: tên học sinh, task type, thời gian nộp, số từ. 3. Danh sách sắp xếp theo `createdAt` tăng dần (FIFO — bài cũ nhất lên trước). 4. Badge số lượng bài pending hiển thị trên menu sidebar (real-time hoặc poll mỗi 30 giây). 5. Giáo viên chỉ thấy bài của học sinh chưa được chấm — không thấy bài đã `Graded`. | 🔴 Must | 3 | `writing-service` |
| US-12 | EPIC-02 | **Là giáo viên**, tôi muốn nhập điểm TR/CC/LR/GRA và nhận xét chi tiết cho từng bài để học sinh nhận được phản hồi có giá trị. | 1. `PUT /api/writing/submissions/:id/grade` chấp nhận `{ criteria: {TR, CC, LR, GRA}, overallBand, teacherFeedback }`. 2. Mỗi giá trị tiêu chí phải trong khoảng 0–9; giá trị ngoài khoảng trả về HTTP 400. 3. Sau khi chấm, `status` chuyển từ `Pending` sang `Graded` và `grading.gradedAt` được ghi nhận đúng. 4. Học sinh thấy điểm ngay trong lần load trang tiếp theo (không cần giáo viên thông báo). 5. Chỉ Teacher và Admin mới gọi được endpoint này (HTTP 403 nếu role là Student). | 🔴 Must | 5 | `writing-service` |
| US-13 | EPIC-02 | **Là giáo viên**, tôi muốn gắn AI feedback vào bài đã chấm để bổ sung phân tích ngôn ngữ sâu hơn cho học sinh. | 1. `PATCH /api/writing/submissions/:id/ai-feedback` chỉ hoạt động trên bài có `status: Graded` (HTTP 400 nếu còn Pending). 2. Giáo viên có thể gọi AI tạo feedback tự động từ `ai-service` hoặc nhập thủ công. 3. `aiFeedback` được lưu dạng `Mixed` JSON — không enforce schema cứng. 4. Có thể PATCH lại để cập nhật/ghi đè `aiFeedback` nhiều lần. 5. Mỗi lần PATCH ghi log `updatedAt` timestamp. | 🟡 Should | 5 | `writing-service` + `ai-service` |
| US-14 | EPIC-02 | **Là giáo viên**, tôi muốn tạo và quản lý đề Writing (Task 1 & Task 2) với bài mẫu để xây dựng ngân hàng đề thi. | 1. `POST /api/writing/` tạo đề mới với `{ title, topic, taskType, prompt }`. 2. `POST /api/writing/:id/samples` thêm bài mẫu vào đề đã tạo. 3. `PUT /api/writing/:id/samples/:sampleId` và `DELETE` hoạt động đúng. 4. Đề mới xuất hiện ngay trong `GET /api/writing/items` cho học sinh. 5. Chỉ Teacher/Admin mới tạo/sửa/xóa đề (Student nhận HTTP 403). | 🟡 Should | 5 | `writing-service` |

---

## EPIC-03: Luyện tập Listening & Dictation

| Story ID | Epic | User Story | Acceptance Criteria | Priority | SP | Service |
|---|---|---|---|---|---|---|
| US-15 | EPIC-03 | **Là học sinh**, tôi muốn chọn đề Listening từ danh sách và nghe audio để chuẩn bị trước khi làm bài. | 1. `GET /api/listening/` trả về danh sách đề với metadata (title, duration, level) — không có đáp án. 2. Audio file được serve qua `media-service` hoặc CDN — không embed trực tiếp trong response JSON. 3. Danh sách hỗ trợ filter theo độ khó. 4. `requireSkill('listening')` middleware chặn học sinh gói FREE nếu kỹ năng không có trong plan. 5. Đề được load trong < 1 giây (metadata only, không stream audio). | 🔴 Must | 3 | `listening-service` |
| US-16 | EPIC-03 | **Là học sinh**, tôi muốn nộp câu trả lời cho từng Part của đề Listening để nhận điểm từng phần ngay lập tức. | 1. `POST /api/listening/:id/submit-part` nhận `{ partIndex, answers: [] }` và trả về `{ score, total, correct, wrong }` ngay lập tức. 2. Đáp án so khớp không phân biệt hoa thường, bỏ qua dấu câu và mạo từ (a, an, the). 3. Kết quả từng part được lưu vào `AttemptResult` và liên kết với `userId`. 4. `POST /api/listening/:id/submit` (full test) cộng điểm tất cả part và lưu 1 record attempt duy nhất. 5. Học sinh thấy câu nào đúng/sai sau khi submit (review mode). | 🔴 Must | 5 | `listening-service` |
| US-17 | EPIC-03 | **Là học sinh**, tôi muốn luyện Dictation để vừa cải thiện kỹ năng nghe vừa luyện viết chính xác. | 1. Giao diện DictationPage phát audio từng đoạn, học sinh gõ lại nội dung nghe được. 2. Hệ thống so khớp câu trả lời sau khi normalize (optional plural, slash-OR, article stripping theo `grading_utils.py`). 3. Highlight từng từ đúng/sai khác màu ngay sau khi submit mỗi đoạn. 4. Có thể nghe lại đoạn tối đa 3 lần trước khi submit (đếm lượt nghe). 5. Điểm Dictation được lưu riêng, không gộp vào điểm Listening thông thường. | 🟡 Should | 5 | `listening-service` |
| US-18 | EPIC-03 | **Là học sinh**, tôi muốn xem lịch sử tất cả lần làm Listening để theo dõi tiến bộ theo thời gian. | 1. `GET /api/listening/my-attempts` trả về danh sách attempt của chính học sinh đó (không thấy của người khác). 2. Mỗi item hiển thị: tên đề, điểm, tổng câu, ngày làm. 3. Danh sách sắp xếp mới nhất lên trước, hỗ trợ phân trang. 4. Click vào attempt → xem chi tiết từng câu hỏi và đáp án đã chọn. 5. Điểm hiển thị dưới dạng phần trăm và số tuyệt đối (VD: 32/40 — 80%). | 🟡 Should | 3 | `listening-service` |
| US-19 | EPIC-03 | **Là giáo viên**, tôi muốn tạo và chỉnh sửa đề Listening (thêm audio, câu hỏi, đáp án) để xây dựng ngân hàng đề. | 1. `POST /api/listening/` tạo đề mới với `{ title, parts: [{ questions: [{ text, answer }] }] }`. 2. `PUT /api/listening/:id` cập nhật đề đã tồn tại mà không mất `AttemptResult` của học sinh. 3. `DELETE /api/listening/:id` chỉ hoạt động khi không có học sinh nào đã làm đề đó (hoặc soft-delete). 4. Đáp án được lưu trữ nhưng không xuất hiện trong `GET /api/listening/:id` cho học sinh. 5. Chỉ Teacher/Admin mới thực hiện được các thao tác CRUD này. | 🟡 Should | 5 | `listening-service` |

---

## EPIC-04: Luyện tập Reading

| Story ID | Epic | User Story | Acceptance Criteria | Priority | SP | Service |
|---|---|---|---|---|---|---|
| US-20 | EPIC-04 | **Là học sinh**, tôi muốn đọc bài và trả lời câu hỏi Reading để luyện kỹ năng đọc hiểu theo chuẩn IELTS. | 1. Trang Reading hiển thị bài đọc và câu hỏi trên cùng màn hình (split view). 2. Submit đáp án → nhận điểm tự động ngay lập tức. 3. Đáp án so khớp theo logic normalize tương tự Listening (case-insensitive, article stripping). 4. Kết quả được lưu và xuất hiện trong lịch sử của học sinh. 5. `requireSkill('reading')` middleware bảo vệ toàn bộ luồng này. | 🔴 Must | 3 | `reading-service` |
| US-21 | EPIC-04 | **Là giáo viên**, tôi muốn xem thống kê kết quả Reading của tất cả học sinh để phát hiện câu hỏi nào học sinh thường làm sai. | 1. `GET /api/reading/attempts` (Teacher/Admin) trả về danh sách tất cả attempts. 2. `GET /api/reading/stats` trả về thống kê: số attempt, điểm trung bình, phân bố điểm. 3. Có thể filter theo đề thi cụ thể để xem thống kê từng bài. 4. Dữ liệu không chứa thông tin cá nhân ngoài tên hiển thị của học sinh. 5. Endpoint chỉ Teacher/Admin truy cập được. | 🟡 Should | 3 | `reading-service` |

---

## EPIC-05: Luyện tập Speaking

| Story ID | Epic | User Story | Acceptance Criteria | Priority | SP | Service |
|---|---|---|---|---|---|---|
| US-22 | EPIC-05 | **Là học sinh**, tôi muốn xem danh sách đề Speaking và chuẩn bị trước khi bắt đầu nói để không bị mất phương hướng. | 1. `GET /api/speaking/` (hoặc tương đương) trả về danh sách đề với `topic`, `part`, `preparationTime`. 2. Mỗi đề hiển thị loại part (Part 1 / Part 2 / Part 3). 3. `requireSkill('speaking')` middleware chặn nếu plan không có speaking. 4. Học sinh thấy trạng thái bài đã nộp hay chưa cho từng đề. 5. Giao diện cung cấp nút "Bắt đầu" chỉ sau khi hết thời gian chuẩn bị (countdown timer). | 🔴 Must | 3 | `speaking-service` |
| US-23 | EPIC-05 | **Là học sinh**, tôi muốn ghi âm câu trả lời Speaking và nộp để nhận phản hồi từ giáo viên. | 1. Frontend ghi âm audio (WebRTC / MediaRecorder API) và upload lên `media-service`. 2. `POST /api/speaking/submissions` gửi `{ speakingId, audioUrl, duration }` và trả về HTTP 201. 3. Bài được lưu với `status: Pending`; audio có thể nghe lại được sau khi nộp. 4. Nếu upload audio thất bại, bài không được lưu — người dùng thấy thông báo lỗi rõ ràng. 5. File audio được lưu trên `cloud-media-service`, không lưu trực tiếp trong DB. | 🔴 Must | 8 | `speaking-service` + `cloud-media-service` |
| US-24 | EPIC-05 | **Là giáo viên**, tôi muốn nghe lại audio Speaking của học sinh và nhập điểm theo 4 tiêu chí để phản hồi chi tiết. | 1. Giao diện SpeakingGrading hiển thị audio player và form nhập điểm trên cùng màn hình. 2. Form nhận điểm FC (Fluency & Coherence), LR, GRA, P (Pronunciation) — mỗi tiêu chí từ 0–9. 3. Sau khi submit, `status` chuyển sang `Graded` và học sinh nhận thông báo. 4. Giáo viên có thể thêm nhận xét văn bản kèm theo điểm. 5. Audio được cache trong trình duyệt để không cần tải lại khi nghe nhiều lần trong cùng phiên. | 🔴 Must | 5 | `speaking-service` |

---

## EPIC-06: Mock Exam (Thi thử 4 kỹ năng)

| Story ID | Epic | User Story | Acceptance Criteria | Priority | SP | Service |
|---|---|---|---|---|---|---|
| US-25 | EPIC-06 | **Là học sinh**, tôi muốn xem danh sách đề thi thử (mock exam) và biết mình đã làm chưa để chọn đề phù hợp. | 1. `GET /api/exams/exams` trả về danh sách exam với `status: published`. 2. Mỗi item hiển thị: tên đề, ngày tạo, trạng thái attempt của học sinh (chưa làm / đang làm / đã hoàn thành). 3. Học sinh không thấy đề ở trạng thái `draft`. 4. Danh sách phân trang, sắp xếp mới nhất trước. 5. `requireSkill` kiểm tra học sinh có đủ quyền làm full test không (dựa trên `maxFullTests` trong plan). | 🔴 Must | 3 | `exam-service` |
| US-26 | EPIC-06 | **Là học sinh**, tôi muốn bắt đầu và làm bài thi thử 4 kỹ năng theo đúng thứ tự (Listening → Reading → Writing → Speaking) để mô phỏng điều kiện thi thật. | 1. `POST /api/exams/exams/:examId/start` tạo `ExamAttempt` mới; nếu đã có attempt chưa hoàn thành thì resume. 2. Mỗi kỹ năng phải được start (`POST .../skills/:skillType/start`) trước khi làm bài. 3. `PUT .../skills/:skillType/snapshot` auto-save câu trả lời mỗi 30 giây — không mất dữ liệu khi reload. 4. Submit từng kỹ năng (`POST .../skills/:skillType/submit`) trước khi chuyển sang kỹ năng tiếp. 5. Reading/Listening chấm tự động ngay; Writing/Speaking chuyển sang `PendingGrading`. | 🔴 Must | 13 | `exam-service` |
| US-27 | EPIC-06 | **Là học sinh**, tôi muốn xem kết quả tổng hợp của bài thi thử sau khi hoàn thành để đánh giá năng lực tổng thể. | 1. Sau `POST /api/attempts/:attemptId/submit`, trang ResultPage hiển thị điểm từng kỹ năng. 2. Reading/Listening hiển thị điểm ngay lập tức. 3. Writing/Speaking hiển thị trạng thái "Đang chờ giáo viên chấm". 4. Khi Teacher chấm xong Writing/Speaking, kết quả cập nhật tự động (polling mỗi 30 giây hoặc notification). 5. Học sinh có thể xem lại bài làm của mình sau khi đã submit. | 🔴 Must | 5 | `exam-service` |
| US-28 | EPIC-06 | **Là giáo viên**, tôi muốn upload file PDF chứa đề thi và để AI tự động phân tích tạo cấu trúc đề để tiết kiệm thời gian tạo đề. | 1. `POST /api/exams/teacher/exams/orchestrate-pdf` nhận `{ fullExamPdf, answerKeyPdf }` (multipart/form-data). 2. Response trả về `{ jobId }` trong < 2 giây. 3. SSE endpoint `GET .../orchestrate-progress/:jobId` phát events: `{ stage: "extracting" | "parsing" | "saving" | "done" }`. 4. Khi hoàn thành, exam record được tạo với đầy đủ cấu trúc câu hỏi. 5. Nếu AI không thể phân tích PDF, trả về lỗi có thể retry — không tạo record rỗng. | 🟡 Should | 8 | `exam-service` + `ai-service` |
| US-29 | EPIC-06 | **Là giáo viên**, tôi muốn xem bảng theo dõi tất cả bài thi đang diễn ra và kết quả của học sinh để nắm được tiến độ. | 1. `GET /api/exams/teacher/monitoring/attempts` trả về tất cả attempts của tất cả học sinh. 2. Mỗi row hiển thị: tên học sinh, đề thi, thời gian bắt đầu, trạng thái từng kỹ năng. 3. Filter theo `status` (in-progress / completed / pending-grading). 4. `GET /api/exams/teacher/students/:userId/attempts` xem lịch sử của một học sinh cụ thể. 5. Chỉ Teacher/Admin truy cập được (HTTP 403 với Student). | 🟡 Should | 5 | `exam-service` |
| US-30 | EPIC-06 | **Là giáo viên**, tôi muốn chấm phần Writing và Speaking trong bài thi thử để hoàn thiện kết quả cho học sinh. | 1. `POST /api/exams/teacher/attempts/:attemptId/grade` nhận điểm Writing và/hoặc Speaking. 2. Sau khi chấm đủ cả 4 kỹ năng, trạng thái attempt chuyển sang `completed`. 3. Học sinh nhận notification khi bài được chấm xong. 4. Giáo viên có thể sửa điểm trước khi confirm lần cuối. 5. Điểm tổng kết được tính theo công thức IELTS (trung bình 4 kỹ năng, làm tròn 0.5). | 🔴 Must | 5 | `exam-service` |

---

## EPIC-07: Gói Dịch Vụ & Thanh Toán VietQR

| Story ID | Epic | User Story | Acceptance Criteria | Priority | SP | Service |
|---|---|---|---|---|---|---|
| US-31 | EPIC-07 | **Là học sinh**, tôi muốn xem chi tiết các gói dịch vụ (FREE/PLUS/PRO) bao gồm kỹ năng được phép và giá để chọn gói phù hợp trước khi mua. | 1. `GET /api/billing/plans` trả về tất cả plan có `isActive: true` — không cần đăng nhập. 2. Mỗi plan hiển thị: `name`, `price`, `durationMonths`, `features[]`, `benefits.skills[]`. 3. Giao diện so sánh 3 gói trên cùng một màn hình (comparison table). 4. Gói đang dùng của học sinh được highlight rõ ràng. 5. Nút "Mua ngay" dẫn trực tiếp đến luồng tạo QR thanh toán. | 🔴 Must | 3 | `billing-service` |
| US-32 | EPIC-07 | **Là học sinh**, tôi muốn tạo mã QR VietQR để thanh toán nâng cấp gói mà không cần rời khỏi nền tảng. | 1. `POST /api/payment/create` nhận `{ planId }` và trả về `{ qrCode (base64/URL), transactionId, amount, bankInfo }`. 2. QR code hiển thị trong modal ngay trong trang — không redirect ra ngoài. 3. `transactionId` được lưu với `status: Pending` và liên kết với `userId`. 4. Học sinh thấy countdown timer hướng dẫn thời gian thanh toán (VD: 15 phút). 5. Nếu cùng học sinh đã có transaction `Pending`, hệ thống trả về transaction cũ thay vì tạo mới. | 🔴 Must | 5 | `payment-service` |
| US-33 | EPIC-07 | **Là Admin**, tôi muốn xem danh sách giao dịch chờ duyệt và xác nhận thanh toán để kích hoạt gói cho học sinh. | 1. `GET /api/payment/transactions` với filter `status=Pending` trả về danh sách giao dịch chưa duyệt. 2. Mỗi transaction hiển thị: tên học sinh, gói đăng ký, số tiền, thời gian tạo. 3. `PUT /api/payment/transactions/:id/approve` → payment-service gọi `billing-service/internal/subscriptions/activate`. 4. Sau khi approve, `user.plan` được cập nhật trong `auth-service`; học sinh truy cập kỹ năng mới ngay lập tức. 5. `PUT /api/payment/transactions/:id/reject` với `{ reason }` chuyển status sang `Rejected` và notification service gửi email cho học sinh. | 🔴 Must | 8 | `payment-service` + `billing-service` + `auth-service` |
| US-34 | EPIC-07 | **Là học sinh**, tôi muốn hệ thống tự động chặn tôi truy cập kỹ năng chưa được phép và hiển thị gợi ý nâng cấp gói thay vì lỗi 403 bí ẩn. | 1. Khi `requireSkill` middleware trả về HTTP 403, Frontend hiển thị modal "Nâng cấp gói" thay vì trang lỗi. 2. Modal liệt kê kỹ năng cần và gói phù hợp nhất để mở khóa. 3. CTA trong modal dẫn thẳng đến trang thanh toán với gói được đề xuất pre-selected. 4. Học sinh không bị mất context (quay lại trang cũ sau khi đóng modal). 5. Endpoint `GET /api/billing/my-skills` trả về danh sách kỹ năng được phép; Frontend sử dụng để ẩn/hiện nav items trước khi user click. | 🔴 Must | 5 | `billing-service` (FE) |
| US-35 | EPIC-07 | **Là Admin**, tôi muốn tạo, chỉnh sửa và bật/tắt gói dịch vụ mà không cần sửa code để linh hoạt điều chỉnh giá và quyền lợi. | 1. `POST /api/billing/admin/plans` tạo plan mới với đầy đủ fields. 2. `PUT /api/billing/admin/plans/:planId` cập nhật plan; học sinh đang có subscription không bị ảnh hưởng ngay lập tức. 3. `PATCH /api/billing/admin/plans/:planId/toggle-active` bật/tắt hiển thị gói mà không xóa. 4. `DELETE /api/billing/admin/plans/:planId` chỉ xóa được plan chưa có subscription nào đang ACTIVE. 5. Thay đổi hiển thị ngay cho học sinh khi load trang `/plans` (không cần redeploy). | 🟡 Should | 5 | `billing-service` |
| US-36 | EPIC-07 | **Là Admin**, tôi muốn hủy subscription của học sinh vi phạm chính sách và ghi lý do để có audit trail. | 1. `POST /api/billing/admin/subscriptions/:id/cancel` nhận `{ reason, title, message }`. 2. `reason` phải thuộc enum: `POLICY_VIOLATION | SYSTEM_ERROR | USER_REQUEST_REFUND`. 3. Sau khi hủy, `user.plan` được reset về `FREE`; học sinh mất quyền truy cập kỹ năng trả phí. 4. `POST /api/billing/admin/subscriptions/:id/restore` hoàn tác hủy (nếu còn trong `validUntil`). 5. Notification service gửi email cho học sinh với `title` và `message` từ request body. | 🟡 Should | 5 | `billing-service` |

---

## EPIC-08: Quản lý AI & Cấu hình Hệ thống (Admin)

| Story ID | Epic | User Story | Acceptance Criteria | Priority | SP | Service |
|---|---|---|---|---|---|---|
| US-37 | EPIC-08 | **Là Admin**, tôi muốn thêm nhiều Gemini API key vào pool để hệ thống tự động luân chuyển khi một key hết quota, đảm bảo không gián đoạn dịch vụ. | 1. Admin nhập `keyString` và `label`; hệ thống lưu với `status: AVAILABLE`. 2. `keyString` được lưu với `select: false` — không bao giờ xuất hiện trong response GET list. 3. Khi AI service nhận lỗi quota từ Gemini, `_rotate_key()` được gọi tự động: key cũ → `EXHAUSTED`, key AVAILABLE tiếp theo → `ACTIVE`. 4. Nếu pool cạn kiệt hết key AVAILABLE, AI service trả về HTTP 503 với message gợi ý Admin thêm key. 5. Dashboard hiển thị số lượng key theo từng status (ACTIVE/AVAILABLE/EXHAUSTED). | 🔴 Must | 5 | `auth-service` |
| US-38 | EPIC-08 | **Là Admin**, tôi muốn chỉnh sửa prompt template cho từng kỹ năng qua giao diện AIManager để tùy chỉnh cách AI chấm bài mà không cần redeploy. | 1. `PUT /api/auth/system-config` (Admin only) cập nhật các trường: `writingGradingPrompt`, `speakingGradingPrompt`, `readingPromptTemplate`, `listeningPromptTemplate`. 2. AI service lấy prompt mới nhất trong mỗi lần gọi (`_fetch_ai_config()`) — không cache cứng trong memory. 3. Giao diện AIManager có textarea riêng cho từng prompt với syntax highlighting. 4. Có nút "Test prompt" cho phép Admin gửi thử 1 bài mẫu và xem output AI ngay trong giao diện. 5. Thay đổi prompt có hiệu lực cho request tiếp theo — không ảnh hưởng đến request đang xử lý. | 🔴 Must | 5 | `auth-service` + `ai-service` |
| US-39 | EPIC-08 | **Là Admin**, tôi muốn xem mức tiêu thụ token Gemini theo tháng để kiểm soát chi phí API. | 1. `GET /api/auth/system-config` (Admin) trả về `monthlyTokensUsed`, `monthlyTokenQuota`, `quotaResetMonth`. 2. Dashboard hiển thị progress bar: token đã dùng / tổng quota. 3. Khi `monthlyTokensUsed` vượt 90% quota, hệ thống gửi cảnh báo cho Admin. 4. `quotaResetMonth` được cập nhật tự động vào đầu tháng, reset `monthlyTokensUsed = 0`. 5. Mỗi lần gọi AI thành công, `monthlyTokensUsed` tăng theo số token thực tế tiêu thụ. | 🟡 Should | 5 | `auth-service` + `ai-service` |
| US-40 | EPIC-08 | **Là Admin**, tôi muốn xem báo cáo tổng quan (Analytics) về số lượt học, giao dịch và người dùng để ra quyết định sản phẩm. | 1. `GET /api/billing/admin/stats` trả về: tổng subscriber, doanh thu tháng hiện tại, breakdown theo plan. 2. Dashboard hiển thị: số người dùng active, số bài nộp trong 7 ngày, số giao dịch pending. 3. Biểu đồ doanh thu theo tuần/tháng (dữ liệu từ payment transactions). 4. Filter theo khoảng thời gian (7 ngày, 30 ngày, 90 ngày). 5. Dữ liệu cập nhật khi refresh trang — không cần real-time streaming. | 🟡 Should | 8 | `billing-service` + `payment-service` |

---

## EPIC-09: Thông Báo (Notifications)

| Story ID | Epic | User Story | Acceptance Criteria | Priority | SP | Service |
|---|---|---|---|---|---|---|
| US-41 | EPIC-09 | **Là học sinh**, tôi muốn nhận thông báo trong ứng dụng khi bài Writing/Speaking của mình đã được giáo viên chấm để biết khi nào xem kết quả. | 1. Khi Teacher chấm bài xong, `notification-service` nhận event qua RabbitMQ và tạo notification record. 2. Icon bell trên navbar hiển thị badge số lượng thông báo chưa đọc. 3. Click vào thông báo → navigate thẳng đến trang kết quả bài tương ứng. 4. Thông báo được đánh dấu là "đã đọc" khi click. 5. `GET /api/notification/my-notifications` trả về 20 thông báo gần nhất của học sinh. | 🟡 Should | 5 | `notification-service` |
| US-42 | EPIC-09 | **Là học sinh**, tôi muốn nhận email xác nhận khi đăng ký thành công và khi gói dịch vụ được kích hoạt để có bằng chứng giao dịch. | 1. Sau `POST /api/auth/register`, notification service gửi email chào mừng trong vòng 60 giây. 2. Sau khi Admin duyệt transaction, học sinh nhận email xác nhận với thông tin gói và ngày hết hạn. 3. Email có subject rõ ràng (VD: "IELTS-Mate: Gói PLUS đã được kích hoạt"). 4. Email không chứa mật khẩu hoặc thông tin nhạy cảm. 5. Nếu email service lỗi, sự kiện được retry tối đa 3 lần trước khi bị drop khỏi queue. | 🔴 Must | 3 | `notification-service` |
| US-43 | EPIC-09 | **Là Admin**, tôi muốn gửi thông báo nhắc nhở cho học sinh sắp hết hạn subscription để tăng tỷ lệ gia hạn. | 1. `POST /api/billing/admin/remind/:userId` kích hoạt gửi email nhắc nhở tới học sinh cụ thể. 2. Nội dung email bao gồm: ngày hết hạn, gói đang dùng, link gia hạn. 3. Có thể schedule tự động: gửi 7 ngày và 1 ngày trước khi hết hạn. 4. Admin xem được log gửi email (đã gửi / thất bại). 5. Học sinh có thể unsubscribe email marketing (không ảnh hưởng email giao dịch). | 🟢 Nice | 5 | `notification-service` + `billing-service` |

---

## EPIC-10: Dashboard, Lịch Sử & Tiến Độ Học Tập

| Story ID | Epic | User Story | Acceptance Criteria | Priority | SP | Service |
|---|---|---|---|---|---|---|
| US-44 | EPIC-10 | **Là học sinh**, tôi muốn thấy Dashboard tổng quan sau khi đăng nhập, bao gồm trạng thái gói, kỹ năng được phép và hoạt động gần đây. | 1. Dashboard hiển thị: tên gói hiện tại, ngày hết hạn (`vipValidUntil`), kỹ năng đang active. 2. Section "Hoạt động gần đây": 3 bài Writing/Speaking gần nhất với status (Pending/Graded). 3. Quick-access buttons cho 4 kỹ năng; button bị disabled + tooltip nếu kỹ năng không trong plan. 4. Tải trang Dashboard hoàn thành trong < 2 giây (TTI). 5. Nếu `vipValidUntil` còn < 7 ngày, hiển thị banner cảnh báo nhắc gia hạn. | 🔴 Must | 5 | FE (tổng hợp từ nhiều service) |
| US-45 | EPIC-10 | **Là học sinh**, tôi muốn xem toàn bộ lịch sử bài Writing đã nộp (cả Pending và Graded) để theo dõi quá trình luyện tập. | 1. `GET /api/writing/submissions/my-submissions` trả về tất cả bài của học sinh đang đăng nhập. 2. Hiển thị: tên đề, task type, ngày nộp, số từ, status, điểm tổng (nếu đã chấm). 3. Click vào bài → trang DetailHistory hiển thị đầy đủ: bài viết, điểm 4 tiêu chí, nhận xét GV, AI feedback. 4. Lọc được theo `status` (Pending / Graded) và `taskType` (Task 1 / Task 2). 5. Bài đang `Pending` hiển thị placeholder "Đang chờ chấm" thay vì để trống phần điểm. | 🔴 Must | 3 | `writing-service` (FE) |
| US-46 | EPIC-10 | **Là giáo viên**, tôi muốn xem trang quản lý học sinh để biết tiến độ học của từng em và phát hiện học sinh cần hỗ trợ thêm. | 1. `GET /api/exams/teacher/students/:userId/attempts` trả về lịch sử mock exam của học sinh đó. 2. Trang StudentManagement liệt kê tất cả học sinh với: số bài đã nộp, điểm trung bình Writing, điểm trung bình Speaking. 3. Click vào học sinh → xem profile học tập chi tiết (lịch sử từng kỹ năng). 4. Hỗ trợ tìm kiếm theo tên/email. 5. Dữ liệu được aggregate từ nhiều service — nếu 1 service chậm, phần còn lại vẫn hiển thị. | 🟡 Should | 8 | `exam-service` + `writing-service` (FE) |

---

## EPIC-11: Hạ Tầng, Bảo Mật & DevOps

| Story ID | Epic | User Story | Acceptance Criteria | Priority | SP | Service |
|---|---|---|---|---|---|---|
| US-47 | EPIC-11 | **Là kỹ sư DevOps**, tôi muốn tất cả service expose endpoint `/health` để hệ thống monitoring phát hiện service bị down tự động. | 1. `GET /health` trên mỗi service trả về HTTP 200 với `{ status: 'ok', service: '<name>', version: '<semver>' }`. 2. Response time của health endpoint < 50ms (không query DB). 3. Docker Compose healthcheck sử dụng endpoint này để restart service khi không phản hồi. 4. Nếu DB connection bị mất, health endpoint trả về HTTP 503 kèm `{ status: 'degraded', reason: 'db' }`. 5. API Gateway aggregate `/health` của tất cả service tại `GET /system/health`. | 🔴 Must | 2 | Tất cả service |
| US-48 | EPIC-11 | **Là kỹ sư bảo mật**, tôi muốn đảm bảo không có API key Gemini nào xuất hiện trong bundle frontend hoặc response API để ngăn lộ thông tin bí mật. | 1. Build frontend (`npm run build`) — scan toàn bộ file trong `/dist` không tìm thấy pattern `AIza...` (Gemini key prefix). 2. `keyString` field trong MongoDB có `select: false` — không xuất hiện trong `GET /api/auth/api-keys`. 3. `/api/internal/*` endpoints trả về HTTP 401 nếu không có header `x-internal-secret` đúng. 4. `ai-service` không expose endpoint public để lấy keyString. 5. Biến môi trường trong `.env` không được commit vào Git (`.gitignore` có `.env`). | 🔴 Must | 3 | `auth-service` + `ai-service` |
| US-49 | EPIC-11 | **Là kỹ sư hạ tầng**, tôi muốn API Gateway xử lý rate limiting tập trung bằng Redis để bảo vệ các service khỏi bị DDoS và spam. | 1. Redis được cấu hình trong `docker-compose.yml` và kết nối với `api-gateway`. 2. Rate limit mặc định: 100 request/phút/IP cho endpoint không-AI. 3. Rate limit cho AI endpoint: 10 request/phút/user. 4. Khi vượt giới hạn, trả về HTTP 429 với header `Retry-After`. 5. Rate limit counter được reset mỗi phút — không tích lũy qua nhiều phút. | 🔴 Must | 5 | `api-gateway` + Redis |
| US-50 | EPIC-11 | **Là kỹ sư**, tôi muốn API Gateway không parse body JSON toàn cục để tránh mất body khi proxy POST/PUT request đến các service. | 1. `api-gateway/server.js` không có `app.use(express.json())` ở global middleware. 2. Tất cả POST/PUT request được proxy nguyên vẹn — body không bị modify. 3. Mỗi service downstream tự cấu hình `express.json({ limit: '100mb' })`. 4. File upload (multipart/form-data) được proxy đúng đến `cloud-media-service` và `exam-service`. 5. Integration test xác nhận body nguyên vẹn sau khi đi qua gateway. | 🔴 Must | 2 | `api-gateway` |

---

## Sprint Planning — Gợi Ý Phân Chia Sprint

| Sprint | Mục tiêu | Stories | Tổng SP |
|---|---|---|---|
| **Sprint 0** — Nền tảng | Auth, roles, health endpoints, Docker infra | US-01, US-02, US-47, US-48, US-49, US-50 | 17 |
| **Sprint 1** — Writing Core | Writing submit + Teacher grading | US-07, US-08, US-11, US-12, US-14 | 19 |
| **Sprint 2** — Writing AI + History | AI feedback, lịch sử, điểm tiêu chí | US-09, US-10, US-13, US-37, US-38, US-45 | 24 |
| **Sprint 3** — Listening + Reading | Listening full/part, dictation, Reading | US-15, US-16, US-17, US-18, US-20 | 19 |
| **Sprint 4** — Speaking | Speaking submit, Teacher chấm | US-22, US-23, US-24 | 16 |
| **Sprint 5** — Mock Exam | Exam start/submit, snapshot, result | US-25, US-26, US-27, US-30 | 26 |
| **Sprint 6** — Billing + Payment | Plans, VietQR, approve flow, skill gate | US-31, US-32, US-33, US-34, US-35 | 21 |
| **Sprint 7** — Admin + Notifications | Analytics, AI admin, notifications | US-39, US-40, US-41, US-42, US-43, US-44 | 26 |
| **Sprint 8** — Hardening | PDF import, student mgmt, profile polish | US-03, US-04, US-05, US-28, US-29, US-46 | 29 |

---

## Backlog Summary

| Epic | Số Stories | Tổng Story Points | Ưu tiên cao nhất |
|---|---|---|---|
| EPIC-01: Auth & Tài khoản | 6 | 17 | US-01, US-02 |
| EPIC-02: Writing | 8 | 27 | US-08, US-11, US-12 |
| EPIC-03: Listening & Dictation | 5 | 19 | US-15, US-16 |
| EPIC-04: Reading | 2 | 6 | US-20 |
| EPIC-05: Speaking | 3 | 16 | US-22, US-23, US-24 |
| EPIC-06: Mock Exam | 6 | 39 | US-25, US-26, US-27, US-30 |
| EPIC-07: Billing & Payment | 6 | 31 | US-31, US-32, US-33, US-34 |
| EPIC-08: AI Admin | 4 | 23 | US-37, US-38 |
| EPIC-09: Notifications | 3 | 13 | US-42 |
| EPIC-10: Dashboard & Progress | 3 | 16 | US-44, US-45 |
| EPIC-11: Infra & Security | 4 | 12 | US-47, US-48, US-49, US-50 |
| **TỔNG** | **50** | **219** | |

---

*Tài liệu được tạo từ PRD v1.0. Mỗi Acceptance Criteria được viết theo chuẩn kiểm thử — cụ thể, đo đếm được, không mơ hồ.*
