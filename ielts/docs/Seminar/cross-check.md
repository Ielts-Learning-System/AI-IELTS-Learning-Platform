# Cross-Check Matrix — IELTS-Mate Documentation

## Quy trình kiểm chứng tài liệu sản phẩm bằng Multi-AI Verification

| Giai đoạn             | Tài liệu / Mã nguồn                                                                                                 | Gemini 3.1 Pro | Claude Sonnet 4.6 | GPT-5.5 |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------- | :-------------: | :---------------: | :-----: |
| **Giai đoạn 1** | **R&D Data ➔ Product Requirement Document (PRD)**                                                                |                |                  |        |
|                         | Phân tích R&D Research (`R&D_Reserach.md`) — xác định pain points, user personas, competitive landscape         | ✅ Kiểm chứng |  ✅ Kiểm chứng  | ✅ Tạo |
|                         | PRD Tiếng Anh (bản nháp đầu) — 14 mục A–N, scope, functional requirements                                       | ✅ Kiểm chứng |  ✅ Kiểm chứng  | ✅ Tạo |
|                         | PRD Tiếng Việt (`PRD.md`) — bám sát mã nguồn thực tế, sửa AI model (Gemini), DB (MongoDB), Writing (hybrid) | ✅ Kiểm chứng |  ✅ Kiểm chứng  | ✅ Tạo |
|                         | Kiểm chứng kỹ thuật: AI = Gemini 2.5 Flash, DB = MongoDB ObjectId, Payment = VietQR                                 | ✅ Kiểm chứng |  ✅ Kiểm chứng  | ✅ Tạo |
| **Giai đoạn 2** | **PRD ➔ Product Backlog & User Stories**                                                                         |                |                  |        |
|                         | Product Backlog (`Product_Backlog.md`) — 50 User Stories, 11 Epics, 219 Story Points                                 | ✅ Kiểm chứng |  ✅ Kiểm chứng  | ✅ Tạo |
|                         | EPIC-01: Auth & Tài khoản (6 stories, 17 SP) — US-01 đến US-06                                                     | ✅ Kiểm chứng |  ✅ Kiểm chứng  | ✅ Tạo |
|                         | EPIC-02: Writing Hybrid Teacher+AI (8 stories, 27 SP) — US-07 đến US-14                                              | ✅ Kiểm chứng |  ✅ Kiểm chứng  | ✅ Tạo |
|                         | EPIC-03: Listening & Dictation (5 stories, 19 SP) — US-15 đến US-19                                                  | ✅ Kiểm chứng |  ✅ Kiểm chứng  | ✅ Tạo |
|                         | EPIC-04: Reading (2 stories, 6 SP) — US-20 đến US-21                                                                 | ✅ Kiểm chứng |  ✅ Kiểm chứng  | ✅ Tạo |
|                         | EPIC-05: Speaking (3 stories, 16 SP) — US-22 đến US-24                                                               | ✅ Kiểm chứng |  ✅ Kiểm chứng  | ✅ Tạo |
|                         | EPIC-06: Mock Exam 4 kỹ năng (6 stories, 39 SP) — US-25 đến US-30                                                  | ✅ Kiểm chứng |  ✅ Kiểm chứng  | ✅ Tạo |
|                         | EPIC-07: Billing & VietQR Payment (6 stories, 31 SP) — US-31 đến US-36                                               | ✅ Kiểm chứng |  ✅ Kiểm chứng  | ✅ Tạo |
|                         | EPIC-08: AI Admin — Gemini key pool + prompt (4 stories, 23 SP) — US-37 đến US-40                                   | ✅ Kiểm chứng |  ✅ Kiểm chứng  | ✅ Tạo |
|                         | EPIC-09: Notifications (3 stories, 13 SP) — US-41 đến US-43                                                          | ✅ Kiểm chứng |  ✅ Kiểm chứng  | ✅ Tạo |
|                         | EPIC-10: Dashboard & Progress (3 stories, 16 SP) — US-44 đến US-46                                                   | ✅ Kiểm chứng |  ✅ Kiểm chứng  | ✅ Tạo |
|                         | EPIC-11: Infra, Security & DevOps (4 stories, 12 SP) — US-47 đến US-50                                               | ✅ Kiểm chứng |  ✅ Kiểm chứng  | ✅ Tạo |
|                         | Sprint Plan 9 sprints — phân chia 219 SP theo thứ tự ưu tiên                                                      | ✅ Kiểm chứng |  ✅ Kiểm chứng  | ✅ Tạo |
| **Giai đoạn 3** | **User Stories ➔ Sprint Planning & Technical Tasks**                                                             |                |                  |        |
|                         | Phân tích hiện trạng codebase — xác định gap giữa Backlog và mã nguồn thực tế                             | ✅ Kiểm chứng |  ✅ Kiểm chứng  | ✅ Tạo |
|                         | Sprint AI Speaking Evaluation (`Sprint_AI_Speaking_Evaluation.md`) — 15 tasks, 34 SP                                 | ✅ Kiểm chứng |  ✅ Kiểm chứng  | ✅ Tạo |
|                         | Category Backend Python: BE-01 (`POST /api/ai/grade-speaking`), Gemini key rotation                                   | ✅ Kiểm chứng |  ✅ Kiểm chứng  | ✅ Tạo |
|                         | Category Backend Node.js: BE-02 schema, BE-03 PATCH endpoint, BE-04 context populate, BE-05 requireSkill                | ✅ Kiểm chứng |  ✅ Kiểm chứng  | ✅ Tạo |
|                         | Category Frontend React+Vite: FE-01…FE-06 (AiFeedbackSection, timer UX, skill gate modal)                              | ✅ Kiểm chứng |  ✅ Kiểm chứng  | ✅ Tạo |
|                         | Category DB & DevOps: DD-01…DD-04 (schema verify, gateway routing, Docker rebuild, integration tests)                  | ✅ Kiểm chứng |  ✅ Kiểm chứng  | ✅ Tạo |
|                         | Dependency graph 2 tuần + Definition of Done                                                                           | ✅ Kiểm chứng |  ✅ Kiểm chứng  | ✅ Tạo |

---

## Chú thích

| Ký hiệu       | Ý nghĩa                                                                                      |
| --------------- | ---------------------------------------------------------------------------------------------- |
| ✅ Tạo         | Tài liệu / artifact được**sinh ra** bởi model này                                 |
| ✅ Kiểm chứng | Nội dung được**đọc, phân tích và xác nhận** tính chính xác bởi model này |

## Tóm tắt vai trò

| AI Model                    | Vai trò trong quy trình                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------ |
| **GPT-4.5**           | Tác giả chính — sinh toàn bộ tài liệu qua 3 giai đoạn (PRD, Backlog, Sprint Plan)      |
| **Gemini 2.5 Pro**    | Reviewer độc lập — kiểm chứng tính chính xác kỹ thuật và alignment với mã nguồn   |
| **Claude Sonnet 4.6** | Reviewer độc lập — kiểm chứng tính nhất quán, bám sát codebase, phát hiện sai lệch |
| **Human**             | Final reviewer — phê duyệt và xác nhận toàn bộ quy trình                                |
