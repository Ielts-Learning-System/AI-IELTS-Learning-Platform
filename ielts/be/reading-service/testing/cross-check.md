# Cross-Check Matrix — Reading Service Test Suite

## Quy trình kiểm chứng bộ kiểm thử `reading-service` bằng Multi-AI Verification

> **Kết quả tổng**: 🟢 **181 / 181 tests PASS** — 5 suites, 0 failures
> **Ngày kiểm thử**: 2026-05-15
> **Framework**: Jest 29.7 · Supertest 7.1 · mongodb-memory-server 10.4
> **Lệnh xác nhận**: `npx jest --testPathPattern="testing/" --no-coverage`

---

## Ma trận kiểm chứng

| Tài liệu / Mã nguồn                                                                                               | Kết quả Jest | Gemini 3.1 Pro | Claude Sonnet 4.6 |     GPT-5.5     | Human |
| --------------------------------------------------------------------------------------------------------------------- | :------------: | :-------------: | :---------------: | :-------------: | :---: |
| **`testing/schema.test.js` — Data Layer (43 test cases)**                                                    |                |                |                  |                |      |
| Suite 1 — ReadingTest Schema: required fields (`title`, `createdBy`)                                             | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| Suite 1 — ReadingTest Schema: default values (`isPublished=false`, timestamps, empty passages)                     | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| Suite 1 — ReadingTest Schema: data type coercion (`isPublished`, string ObjectId, empty description)               | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| Suite 2 — passageSchema: required fields (`title`, `content`, `passageNumber`)                                 | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| Suite 2 — passageSchema: optional `image`, long HTML content (50 000 chars)                                        | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| Suite 3 — questionSchema: required fields (`questionNumber`, `text`, `correctAnswer`)                          | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| Suite 3 — questionSchema: enum validation (5 valid types + 1 invalid)                                                | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| Suite 3 — questionSchema: optional `explanation`, empty `options` array                                          | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| Suite 4 — ReadingAttempt Schema: required fields (`testId`, `studentId`, `rawScore`, `bandScore`)            | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| Suite 4 — ReadingAttempt Schema: default values (`timeSpent=0`, `passageNumber=null`, `details=[]`)            | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| Suite 4 — ReadingAttempt Schema: numeric constraints min/max (`rawScore`, `bandScore`, `timeSpent`)            | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| Suite 4 — AttemptDetail subdocument: required fields,`studentAnswer` default `""`                                | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| **`testing/unit.test.js` — Business Logic Layer (47 test cases)**                                            |                |                |                  |                |      |
| Suite 1 —`convertRawToBand`: 20 band boundary values (0–40 toàn bộ bảng IELTS)                                 | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| Suite 1 —`convertRawToBand`: module type guard (`writing`→0, `speaking`→0, `listening`→OK)                | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| Suite 1 —`convertRawToBand`: case-insensitive moduleType (`READING`, `Reading`)                                | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| Suite 1 —`convertRawToBand`: default moduleType = `reading` khi `undefined`                                    | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| Suite 1 —`convertRawToBand`: defensive inputs (negative, >40, float, NaN, string, null)                            | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| Suite 2 —`submitTest` grading: rawScore 0/partial/full, empty array                                                | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| Suite 2 —`isAnswerCorrect`: case-insensitive, trim whitespace, alternate `/` answers                             | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| Suite 2 —`isAnswerCorrect`: null entry coerced to `""` không crash                                              | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| Suite 2 — details array: đúng length,`questionIndex` bắt đầu từ 1                                            | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| Suite 2 — input validation guards: không phải array→400, test không tồn tại→404, DB throw→500                | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| Suite 3 —`getAllTests` pagination: `$skip`/`$limit` từ query params, default page=1/limit=10                  | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| **`testing/api.test.js` — Integration / HTTP Layer (37 test cases)**                                         |                |                |                  |                |      |
| `GET /` — empty DB→200+[], 1 record→200+1, pagination page 2, security (questions stripped)                      | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| `GET /:id` — full detail→200, non-existent→404, malformed ObjectId→4xx/5xx                                      | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| `POST /` — teacher→201, admin→201, missing title→400, empty passages→400                                       | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| `POST /` — no token→401, student→403                                                                             | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| `PUT /:id` — owner→200, admin→200, non-owner→403, not found→404                                                | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| `DELETE /:id` — owner→200+DB removed, non-owner→403, not found→404                                              | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| `POST /:id/submit` — correct scoring (rawScore, bandScore, details), all-wrong, empty array                        | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| `POST /:id/submit` — non-array→400, no token→401, not found→404                                                 | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| `POST /:id/submit-passage` — passage 1 grading, passageNumber 0→400, 4→400, missing passage→404                 | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| `GET /my-attempts` — chỉ trả về attempt của chính student, no token→401                                      | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| `GET /attempts` — teacher→200, student→403                                                                       | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| `GET /stats` — có `totalAttempts`+`avgBandScore`, reflect seeded data, student→403                           | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| **`testing/e2e.test.js` — End-to-End Journeys (21 test cases)**                                              |                |                |                  |                |      |
| Journey A Step 1: Teacher tạo test 5 câu hỏi → 201, passages+questions intact                                     | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| Journey A Step 2: Student (no token) list tests → 200, thấy test mới, questions bị ẩn                            | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| Journey A Step 3: Student fetch detail → 200, 5 questions,`correctAnswer` defined                                  | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| Journey A Step 4: Student submit 3 đúng / 2 sai → 201                                                              | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| Journey A Step 5: Xác nhận rawScore=3, bandScore=2.0, details[3].isCorrect=false, timeSpent=1800                    | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| Journey A Step 6: Student history → 1 attempt, đúng `_id`                                                        | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| Journey A Step 7: Teacher xem all attempts → 1 result, đúng `studentId`                                          | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| Journey B Step 1: Teacher tạo test 2 passages → 201                                                                 | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| Journey B Step 2+3: Submit passage 1 (2/3 đúng) → passageNumber=1, rawScore=2, details pattern [T,F,T]             | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| Journey B Step 4: Stats → totalAttempts=1                                                                            | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| Journey C Step 1–4: 3 tests → pagination page 1/2, navigate to detail by `_id`                                    | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| Journey D: 7 band score cases qua HTTP (raw 0→1.5, 2→2.0, 10→4.0, 23→6.0, 30→7.0, 39→9.0, 40→9.0)              | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| **`testing/regression.test.js` — Edge Cases & Bug Prevention (33 test cases)**                               |                |                |                  |                |      |
| R01 — Normalisation:`"true"`=`"TRUE"`, `"  B  "`=`"B"`, `"ten"`=`"10/ten"`, `"TEN"`=`"10/ten"`       | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| R01 — Normalisation:`"Not Given"`=`"NOT GIVEN"`, double-space no crash                                           | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| R02 — Boundaries: empty array→rawScore=0, null entry→coerce `""`, numeric `[1,2]`→coerce `["1","2"]`        | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| R02 — Boundaries: more answers than questions no crash, undefined entry no crash                                     | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| R03 — Security: XSS `<script>` stored as-is không crash, 10 000 char answer no crash                              | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| R03 — Security: SQL injection string no crash, NoSQL `?page[$gt]=0` no DB dump                                     | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| R04 — Isolation: Student A không thấy attempt của Student B, mỗi student chỉ thấy data của mình              | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| R05 — Known Bug:`POST /` không có `isPublished` → controller default `true` (không phải schema `false`) | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| R05 — Regression:`POST /` với `isPublished: false` → stored `false`                                          | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| R06 — Routing: submit to deleted testId→404, malformed ObjectId→≥400, DELETE deleted→404                         | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| R07 — submit-passage: passageNumber 0→400, 4→400, missing passage→404, string coerce no crash                     | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| R08 — timeSpent: negative→0, zero→0, string `"300"`→300                                                         | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |
| R09 — Unicode:`"café"` match, emoji `"🎯"` no crash, Vietnamese `"Không Đúng"` UTF-8, null char `\u0000` | ✅ PASS | ✅ Kiểm chứng |      ✅ Tạo      | ✅ Kiểm chứng |  ✅  |

---

## Kết quả tổng hợp theo file

| File                           |    Suites    |  Test Cases  |         Jest Result         |
| ------------------------------ | :----------: | :-----------: | :-------------------------: |
| `testing/schema.test.js`     |      4      |      43      |       🟢 43 / 43 PASS       |
| `testing/unit.test.js`       |      3      |      47      |       🟢 47 / 47 PASS       |
| `testing/api.test.js`        |      10      |      37      |       🟢 37 / 37 PASS       |
| `testing/e2e.test.js`        |      4      |      21      |       🟢 21 / 21 PASS       |
| `testing/regression.test.js` |      9      |      33      |       🟢 33 / 33 PASS       |
| **Tổng**                | **30** | **181** | **🟢 181 / 181 PASS** |

---

## Chú thích

| Ký hiệu       | Ý nghĩa                                                                                      |
| --------------- | ---------------------------------------------------------------------------------------------- |
| ✅ Tạo         | Test case / artifact được**sinh ra** bởi model này                                  |
| ✅ Kiểm chứng | Nội dung được**đọc, phân tích và xác nhận** tính chính xác bởi model này |
|          | Jest thực thi thành công, assertion không có lỗi                                         |
| 🟢              | Toàn bộ test cases trong nhóm đều PASS                                                    |

---

## Tóm tắt vai trò

| AI Model                    | Vai trò trong quy trình                                                                                      |
| --------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Claude Sonnet 4.6** | Tác giả chính — phân tích toàn bộ mã nguồn `reading-service` và sinh 5 file test (181 test cases) |
| **Gemini 2.5 Pro**    | Reviewer độc lập — kiểm chứng tính chính xác logic chấm điểm, schema constraints, bảo mật        |
| **GPT-4.5**           | Reviewer độc lập — kiểm chứng tính nhất quán giữa test cases và đặc tả API/controller            |
| **Human**             | Final reviewer — chạy `npx jest`, xác nhận 181/181 PASS, phê duyệt bộ test                            |

---

## Bug đã phát hiện & fix trong quá trình kiểm chứng

| Bug ID | Mô tả                                                                                              | File phát hiện             | Trạng thái                                          |
| ------ | ---------------------------------------------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------- |
| BUG-01 | `isPublished` controller default = `true`, schema default = `false` — không nhất quán      | `regression.test.js` (R05) | 📝 Documented, test case ghi nhận hành vi thực tế |
| BUG-02 | `e2e.test.js` global `afterEach` xóa DB giữa các bước của cùng 1 journey → 11 tests fail | `e2e.test.js`              | ✅ Fixed — thay bằng `beforeAll` per-journey      |
