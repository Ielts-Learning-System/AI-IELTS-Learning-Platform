# Sprint Planning — AI Speaking Evaluation Module
## Tech Lead Sprint Breakdown Document

| Trường | Chi tiết |
|---|---|
| **Sprint** | Sprint 5 (2 tuần) |
| **Epic nguồn** | EPIC-05: Luyện tập Speaking + AI Evaluation Extension |
| **User Stories** | US-22 · US-23 · US-24 (Backlog v1.0) |
| **Sprint Goal** | Tích hợp AI Gemini vào luồng chấm Speaking: Teacher chấm thủ công → Teacher/Admin kích hoạt AI feedback → Học sinh đọc phân tích AI bên cạnh điểm giáo viên |
| **Tech Stack** | React + Vite + TypeScript (FE) · Node.js/Express (speaking-service) · FastAPI/Python (ai-service) · MongoDB / Docker Compose |
| **Tổng Story Points** | 16 SP (US-22: 3 · US-23: 8 · US-24: 5) |

---

## Phân Tích Hiện Trạng Codebase

> Đọc kỹ trước khi estimate để tránh build lại những gì đã tồn tại.

### ✅ Đã tồn tại (KHÔNG làm lại)

| Component | Vị trí | Trạng thái |
|---|---|---|
| `SpeakingTest` model (title, part1[], part2, part3[]) | `speaking-service/src/models/SpeakingTest.js` | Done |
| `SpeakingSubmission` model (answers[], FC/LR/GRA/PR grading) | `speaking-service/src/models/SpeakingSubmission.js` | Done |
| CRUD routes: GET/POST/PUT/DELETE `/tests` | `speaking-service/src/routes/speaking.routes.js` | Done |
| `POST /tests/:testId/attempt` — student submit audio | speaking-service | Done |
| `GET /submissions/my-submissions` — student history | speaking-service | Done |
| `GET /pending`, `PUT /:id/grade` — teacher grading | speaking-service | Done |
| `SpeakingGrading`, `SpeakingGradingDetail` pages (Teacher) | `fe/src/pages/teacher/` | Done |
| `speakingGradingPrompt` field trong `SystemConfig` | auth-service | Done |
| AIManager UI — textarea chỉnh `speakingGradingPrompt` | `fe/src/pages/admin/AIManager.tsx` | Done |
| PDF extractor Speaking (`_PDF_SPEAKING_SYSTEM_PROMPT`) | `ai-service/main.py` | Done |
| Gemini key rotation wrapper (`_call_gemini_contents_with_rotation`) | `ai-service/main.py` | Done |

### ❌ Còn thiếu (Sprint này sẽ build)

| Component | Gap | Story |
|---|---|---|
| Field `aiFeedback` trên `SpeakingSubmission` | Model chưa có trường này (Writing đã có) | US-24 |
| `PATCH /api/speaking/:id/ai-feedback` | Endpoint chưa tồn tại | US-24 |
| `POST /api/ai/grade-speaking` trên ai-service | `speakingGradingPrompt` tồn tại trong config nhưng không có endpoint consume nó | US-24 |
| Nút "Tạo AI Feedback" trong `SpeakingGradingDetail` | Teacher không có nơi kích hoạt AI | US-24 |
| Section "AI Feedback" trên trang lịch sử học sinh | Student không thấy AI feedback sau khi Teacher kích hoạt | US-22 |
| Countdown timer + "chuẩn bị" UX trước khi ghi âm | US-22 yêu cầu preparation timer | US-22 |
| Xử lý lỗi upload audio rõ ràng trên FE | Upload thất bại không báo lỗi cụ thể | US-23 |

---

## Phân Chia Task Theo Danh Mục

---

### 📁 CATEGORY 1 — BACKEND (Node.js · Python)

#### Task BE-01: Thêm endpoint `POST /api/ai/grade-speaking` vào ai-service
**Story:** US-24  
**Service:** `ai-service` (FastAPI/Python)  
**Mô tả kỹ thuật:**  
Tạo endpoint mới trong `ai-service/main.py`. Endpoint nhận context bài nói (danh sách câu hỏi + audio transcript hoặc raw text do Teacher cung cấp), gọi `_call_gemini_contents_with_rotation()` với `speakingGradingPrompt` lấy từ `_fetch_ai_config()`, trả về JSON feedback.

```
POST /api/ai/grade-speaking
Headers: Authorization: Bearer <JWT>
Body: {
  submissionId: string,       // ObjectId của SpeakingSubmission
  questions: string[],        // Part 1/2/3 questions
  teacherNotes?: string       // Optional context từ teacher
}
Response: {
  aiFeedback: {
    fluency_comment: string,
    lexical_comment: string,
    grammar_comment: string,
    pronunciation_comment: string,
    overall_advice: string,
    estimated_band: number
  }
}
```

**Chi tiết implementation:**  
- Gọi `_fetch_ai_config()` để lấy `speakingGradingPrompt` (không cache cứng)  
- Format prompt: inject `questions`, `teacherNotes`, điểm FC/LR/GRA/PR từ `speaking-service` vào template  
- Wrap trong `try/except` cho quota exhaustion → gọi `_rotate_key()` nếu cần  
- Ghi tăng `monthlyTokensUsed` qua `PATCH /api/internal/system-config`  
- Trả về HTTP 422 nếu `speakingGradingPrompt` trống trong config  

**Story Points:** 5  
**Người phụ trách:** Backend (Python)

---

#### Task BE-02: Thêm field `aiFeedback` vào `SpeakingSubmission` model
**Story:** US-24  
**Service:** `speaking-service` (Node.js/Mongoose)  
**Mô tả kỹ thuật:**  
Mở rộng schema `SpeakingSubmissionSchema` trong `src/models/SpeakingSubmission.js`:

```js
// Thêm vào SpeakingSubmissionSchema
aiFeedback: {
  type: mongoose.Schema.Types.Mixed,
  default: undefined,
},
aiFeedbackGeneratedAt: {
  type: Date,
  default: undefined,
},
```

Không enforce schema cứng cho `aiFeedback` (giống `writingSubmission.model.js`) để linh hoạt với Gemini output.

**Lưu ý:** MongoDB là schemaless — field mới tự động backward-compatible với documents cũ. Không cần migration script.

**Story Points:** 1  
**Người phụ trách:** Backend (Node.js)

---

#### Task BE-03: Thêm endpoint `PATCH /api/speaking/:id/ai-feedback` vào speaking-service
**Story:** US-24  
**Service:** `speaking-service` (Node.js/Express)  
**Mô tả kỹ thuật:**  
Tạo controller function `generateAiFeedback` trong `speakingSubmission.controller.js`:

```
PATCH /api/speaking/:id/ai-feedback
Auth: verifyToken + authorizeRoles('teacher', 'admin')
Body: { aiFeedback?: object }   // optional — nếu không có, service tự gọi ai-service
Response: { success: true, data: updatedSubmission }
```

Logic:
1. Load submission, kiểm tra `status === 'Graded'` — trả HTTP 400 nếu còn `Pending`  
2. Nếu `req.body.aiFeedback` được truyền → lưu trực tiếp (Teacher nhập thủ công)  
3. Nếu không có → gọi `ai-service` qua HTTP: `POST http://ai-service:3012/api/ai/grade-speaking` với `x-internal-secret` header, truyền `{ submissionId, questions, teacherNotes }`  
4. Lưu `aiFeedback` và `aiFeedbackGeneratedAt = new Date()` vào document  
5. Có thể PATCH lại nhiều lần (overwrite)  

Thêm route vào `speaking.routes.js`:
```js
router.patch('/:id/ai-feedback', verifyToken, authorizeRoles('teacher', 'admin'), generateAiFeedback);
```

**Story Points:** 3  
**Người phụ trách:** Backend (Node.js)

---

#### Task BE-04: Bổ sung `questions` context vào response grading detail
**Story:** US-24  
**Service:** `speaking-service`  
**Mô tả kỹ thuật:**  
`GET /api/speaking/:id` (hoặc submission detail) cần trả về `questions[]` từ `SpeakingTest` liên kết, để ai-service và FE có đủ context khi gọi AI.

Trong controller `getSubmissionDetail` (nếu chưa tồn tại, thêm):
```js
// Populate testId để lấy questions
const submission = await SpeakingSubmission
  .findById(req.params.id)
  .populate('testId', 'title part1 part2 part3');
```

Trả về response với:
```json
{
  "data": {
    "submission": { ...fields... },
    "test": { "title": "...", "part1": [], "part2": "...", "part3": [] }
  }
}
```

**Story Points:** 2  
**Người phụ trách:** Backend (Node.js)

---

#### Task BE-05: Gắn `requireSkill('speaking')` middleware vào speaking routes
**Story:** US-22  
**Service:** `speaking-service` + `billing-service`  
**Mô tả kỹ thuật:**  
Hiện tại `GET /` (student list) và `POST /tests/:testId/attempt` chưa kiểm tra plan. Cần thêm `requireSkill` middleware (tương tự pattern trong writing-service):

```js
// Import và thêm vào routes có authenticate
router.get('/', verifyToken, requireSkill('speaking'), getAllSpeakingTests);
router.post('/tests/:testId/attempt', verifyToken, requireSkill('speaking'), startOrUpdateAttempt);
```

`requireSkill` gọi nội bộ `billing-service` để lấy plan hiện tại của user và kiểm tra `benefits.skills` — nếu `speaking` không có trong list, trả HTTP 403 với payload `{ upgradeRequired: true, requiredSkill: 'speaking' }`.

**Story Points:** 2  
**Người phụ trách:** Backend (Node.js)

---

### 📁 CATEGORY 2 — FRONTEND (React + Vite + TypeScript)

> **Lưu ý**: Project sử dụng **React + Vite + TypeScript** (không phải Next.js). State management: **Zustand**. Routing: **React Router v6**. Auth: `localStorage('accessToken')`.

---

#### Task FE-01: Thêm "AI Feedback" section vào trang lịch sử học sinh
**Story:** US-22  
**File:** `fe/src/pages/History.tsx`  
**Mô tả kỹ thuật:**  
Hiện tại `History.tsx` đã có `speakingGrading?: SpeakingSubmission['grading']` (line 107). Cần thêm render AI feedback:

```tsx
// Sau phần hiển thị teacherFeedback
{item.speakingAiFeedback && (
  <AiFeedbackSection data={item.speakingAiFeedback} />
)}
```

- Tạo component `<AiFeedbackSection>` tái sử dụng (dùng cho cả Writing và Speaking)  
- Render nội dung Markdown bằng `react-markdown` (đã cài nếu Writing dùng — kiểm tra `package.json`)  
- Nếu `aiFeedback` là `null`/`undefined` → ẩn section hoàn toàn (không render placeholder)  
- Cập nhật type `SpeakingSubmission` trong `fe/src/types/` để thêm `aiFeedback?: Record<string, unknown>`  

**Story Points:** 2  
**Người phụ trách:** Frontend

---

#### Task FE-02: Thêm nút "Tạo AI Feedback" vào SpeakingGradingDetail (Teacher)
**Story:** US-24  
**File:** `fe/src/pages/teacher/SpeakingGradingDetail.tsx`  
**Mô tả kỹ thuật:**  
Teacher đang ở trang detail sau khi đã chấm. Thêm button:

```tsx
<Button
  onClick={handleGenerateAiFeedback}
  disabled={submission.status !== 'Graded' || isGenerating}
  variant="outline"
>
  {isGenerating ? <Spinner /> : '✨ Tạo AI Feedback'}
</Button>
```

Logic `handleGenerateAiFeedback`:
```ts
const handleGenerateAiFeedback = async () => {
  setIsGenerating(true);
  try {
    const res = await fetch(`/api/speaking/${id}/ai-feedback`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setSubmission(prev => ({ ...prev, aiFeedback: data.data.aiFeedback }));
    toast.success('AI Feedback đã được tạo thành công');
  } catch {
    toast.error('Không thể tạo AI Feedback. Vui lòng thử lại.');
  } finally {
    setIsGenerating(false);
  }
};
```

- Nút disable nếu submission còn `Pending`  
- Tooltip: "Chỉ có thể tạo AI Feedback sau khi đã chấm điểm thủ công"  
- Sau khi tạo thành công, hiển thị AI feedback ngay trong trang (optimistic update)  

**Story Points:** 3  
**Người phụ trách:** Frontend

---

#### Task FE-03: Countdown timer và UX chuẩn bị trước khi ghi âm
**Story:** US-22  
**File:** `fe/src/pages/SpeakingTest.tsx` (hoặc `SpeakingPracticePage.tsx`)  
**Mô tả kỹ thuật:**  
Hiện tại chưa có preparation flow. Thêm state machine đơn giản:

```
IDLE → PREPARING (30s countdown) → RECORDING → SUBMITTED
```

Implementation:
```tsx
type RecordingPhase = 'idle' | 'preparing' | 'recording' | 'submitted';
const [phase, setPhase] = useState<RecordingPhase>('idle');
const [prepCountdown, setPrepCountdown] = useState(30); // 30s prep for Part 2

// Hiển thị theo phase:
// - 'idle': nút "Bắt đầu chuẩn bị"
// - 'preparing': countdown timer + bài cue card (Part 2) hoặc câu hỏi (Part 1/3)
// - 'recording': MediaRecorder active + thời gian đã ghi (tối đa 2 phút)
// - 'submitted': audio player để nghe lại + nút submit
```

Countdown dùng `useEffect` + `setInterval`, clear on unmount.  
Nút "Bắt đầu ghi âm" chỉ enable sau khi `prepCountdown === 0`.

**Story Points:** 3  
**Người phụ trách:** Frontend

---

#### Task FE-04: Xử lý lỗi upload audio với thông báo rõ ràng
**Story:** US-23  
**File:** `fe/src/pages/SpeakingTest.tsx`  
**Mô tả kỹ thuật:**  
Hiện tại flow upload qua `cloud-media-service` không có error handling cụ thể. Cần:

1. **Upload progress indicator**: thanh progress bar khi đang upload lên Cloudinary  
2. **Retry mechanism**: nếu upload thất bại, hiển thị nút "Thử lại" (max 3 lần auto-retry với exponential backoff)  
3. **Các trường hợp lỗi cần handle riêng**:
   - Network timeout → "Kết nối bị gián đoạn, đang thử lại..."
   - File quá lớn (> 25MB) → "File audio quá lớn. Vui lòng ghi lại ngắn hơn."  
   - Media service 503 → "Dịch vụ lưu trữ tạm thời không khả dụng."  
4. **Đảm bảo**: nếu upload thất bại → **không tạo submission record** (trạng thái FE vẫn ở `'recording'`)  

```tsx
const uploadAudio = async (blob: Blob): Promise<string> => {
  const formData = new FormData();
  formData.append('file', blob, `speaking-${Date.now()}.webm`);
  const res = await fetch('/api/media/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Upload failed');
  }
  return (await res.json()).url;
};
```

**Story Points:** 3  
**Người phụ trách:** Frontend

---

#### Task FE-05: Hiển thị skill gate — modal nâng cấp gói khi truy cập Speaking
**Story:** US-22  
**File:** `fe/src/pages/SpeakingListPage.tsx` (hoặc tương đương)  
**Mô tả kỹ thuật:**  
Khi `requireSkill('speaking')` trả về HTTP 403 với `{ upgradeRequired: true }`, Frontend phải intercept và hiển thị `<UpgradeModal>` thay vì trang lỗi.

```tsx
// Trong API call hook hoặc axios interceptor
if (response.status === 403 && data.upgradeRequired) {
  openUpgradeModal({ requiredSkill: data.requiredSkill });
  return; // Không navigate đến error page
}
```

`<UpgradeModal>` (component tái sử dụng, có thể đã tồn tại từ Writing):
- Tiêu đề: "Nâng cấp để luyện Speaking"  
- Liệt kê gói có `speaking` trong `benefits.skills` (gọi `GET /api/billing/plans`)  
- CTA: "Xem gói ngay" → navigate đến `/billing/plans?highlight=PLUS`  
- Nút đóng: quay lại trang trước (`navigate(-1)`)  

**Story Points:** 2  
**Người phụ trách:** Frontend

---

#### Task FE-06: Tạo component `<AiFeedbackSection>` tái sử dụng
**Story:** US-22 / US-24  
**File:** `fe/src/components/AiFeedbackSection.tsx` (mới)  
**Mô tả kỹ thuật:**  
Component dùng chung cho cả Writing và Speaking AI feedback:

```tsx
interface AiFeedbackSectionProps {
  data: Record<string, unknown>; // Mixed JSON từ Gemini
  isLoading?: boolean;
  onRefresh?: () => void; // Optional: Teacher có thể regenerate
}

export function AiFeedbackSection({ data, isLoading, onRefresh }: AiFeedbackSectionProps) {
  // Render từng key-value của Gemini output
  // Support: string (Markdown), number (band estimate), array (bullet list)
  // Lazy-load: sử dụng React.Suspense hoặc conditional import cho react-markdown
}
```

Render strategy:
- Nếu `data.estimated_band` là `number` → hiển thị badge band  
- Nếu value là `string` → render qua `<ReactMarkdown>`  
- Nếu value là `string[]` → render `<ul>` list  
- Key names được format từ snake_case → "Fluency Comment", "Overall Advice", v.v.  

**Story Points:** 2  
**Người phụ trách:** Frontend

---

### 📁 CATEGORY 3 — DATABASE & DEVOPS

---

#### Task DD-01: Schema update — field `aiFeedback` trên SpeakingSubmission
**Story:** US-24  
**Service:** `speaking-service` MongoDB (`ielts_speaking_db`)  
**Mô tả kỹ thuật:**  
MongoDB là schemaless — thêm field `aiFeedback: Mixed` vào Mongoose schema là đủ để backward-compatible. Không cần migration script vì documents cũ không có field này sẽ trả về `undefined` (handled ở FE).

**Verification checklist:**
```js
// Test trong Mongosh sau khi deploy:
db.speakingsubmissions.findOne({ aiFeedback: { $exists: true } })
// → Trả về document có aiFeedback sau khi Teacher patch
db.speakingsubmissions.findOne({ aiFeedback: { $exists: false } })
// → Trả về document cũ (backward compatible)
```

**Story Points:** 1  
**Người phụ trách:** DB/DevOps

---

#### Task DD-02: Kiểm tra và cập nhật API Gateway routing cho `/api/ai/grade-speaking`
**Story:** US-24  
**File:** `api-gateway/server.js`  
**Mô tả kỹ thuật:**  
Route `/api/ai` đã có trong gateway (proxy đến `ai-service:3012`). Cần verify rằng `POST /api/ai/grade-speaking` đi qua đúng:

```js
// Kiểm tra trong api-gateway/server.js — nên đã tồn tại:
app.use('/api/ai', createProxyMiddleware({
  target: 'http://ai-service:3012',
  changeOrigin: true,
}));
```

Nếu `ai-service` đang listen trên `/` (root) thay vì `/api/ai`, cần kiểm tra `pathRewrite`:
```js
pathRewrite: { '^/api/ai': '' }
```

**Không thêm `express.json()` global** — đây là quy tắc bất biến của gateway.

**Story Points:** 1  
**Người phụ trách:** DevOps

---

#### Task DD-03: Thêm endpoint mới vào `ai-service` Dockerfile & requirements
**Story:** US-24  
**File:** `ai-service/Dockerfile`, `ai-service/requirements.txt`  
**Mô tả kỹ thuật:**  
`ai-service/main.py` là file empty hiện tại. Khi thêm endpoint `POST /grade-speaking`, cần xác nhận dependencies:

```txt
# requirements.txt — verify các package sau đã có:
fastapi>=0.100.0
uvicorn[standard]
httpx
google-genai         # google.genai SDK
pydantic
python-multipart     # Không cần cho endpoint này nhưng đã có từ PDF upload
```

Rebuild Docker image sau khi thay đổi `main.py`:
```bash
docker compose build ai-service
docker compose up -d ai-service
```

Kiểm tra health sau rebuild:
```bash
curl http://localhost:3012/health
# → { "status": "ok" }
```

**Story Points:** 1  
**Người phụ trách:** DevOps

---

#### Task DD-04: Integration test — luồng AI feedback Speaking end-to-end
**Story:** US-24  
**File:** Mới: `ielts/be/speaking-service/tests/ai-feedback.test.js`  
**Mô tả kỹ thuật:**  
Viết Jest integration test (mock ai-service bằng `nock` hoặc `msw`):

```js
describe('Speaking AI Feedback', () => {
  it('PATCH /:id/ai-feedback từ chối bài Pending', async () => {
    // Setup: tạo submission với status: Pending
    // Action: PATCH /:id/ai-feedback
    // Assert: HTTP 400
  });

  it('PATCH /:id/ai-feedback lưu aiFeedback vào DB', async () => {
    // Setup: tạo submission với status: Graded
    // Mock ai-service trả về { aiFeedback: { ... } }
    // Action: PATCH /:id/ai-feedback (không có body → tự gọi ai-service)
    // Assert: HTTP 200; submission.aiFeedback tồn tại trong DB
  });

  it('PATCH /:id/ai-feedback với aiFeedback thủ công không gọi ai-service', async () => {
    // Setup: submission Graded
    // Action: PATCH với body { aiFeedback: { manual: 'test' } }
    // Assert: HTTP 200; ai-service không được gọi (verify mock không fire)
  });

  it('Student nhận HTTP 403 khi gọi PATCH /:id/ai-feedback', async () => {
    // ...
  });
});
```

**Story Points:** 3  
**Người phụ trách:** Backend/QA

---

## Sprint Backlog Summary Table

| Task ID | Category | Tên Task | Story | SP | Người phụ trách | Phụ thuộc |
|---|---|---|---|---|---|---|
| **BE-01** | Backend (Python) | Endpoint `POST /api/ai/grade-speaking` | US-24 | 5 | BE Python | — |
| **BE-02** | Backend (Node.js) | Thêm field `aiFeedback` vào SpeakingSubmission schema | US-24 | 1 | BE Node.js | — |
| **BE-03** | Backend (Node.js) | Endpoint `PATCH /api/speaking/:id/ai-feedback` | US-24 | 3 | BE Node.js | BE-01, BE-02 |
| **BE-04** | Backend (Node.js) | Populate `questions` context trong submission detail | US-24 | 2 | BE Node.js | — |
| **BE-05** | Backend (Node.js) | `requireSkill('speaking')` middleware trên routes | US-22 | 2 | BE Node.js | — |
| **FE-01** | Frontend (React) | AI Feedback section trong History.tsx | US-22 | 2 | FE | BE-03 |
| **FE-02** | Frontend (React) | Nút "Tạo AI Feedback" trong SpeakingGradingDetail | US-24 | 3 | FE | BE-03 |
| **FE-03** | Frontend (React) | Countdown timer UX trước khi ghi âm | US-22 | 3 | FE | — |
| **FE-04** | Frontend (React) | Error handling upload audio | US-23 | 3 | FE | — |
| **FE-05** | Frontend (React) | Skill gate modal nâng cấp gói Speaking | US-22 | 2 | FE | BE-05 |
| **FE-06** | Frontend (React) | Component `<AiFeedbackSection>` tái sử dụng | US-22/24 | 2 | FE | — |
| **DD-01** | DB | Schema verify aiFeedback backward-compat | US-24 | 1 | DevOps | BE-02 |
| **DD-02** | DevOps | Verify API Gateway routing `/api/ai` | US-24 | 1 | DevOps | BE-01 |
| **DD-03** | DevOps | Rebuild ai-service Docker image | US-24 | 1 | DevOps | BE-01 |
| **DD-04** | QA | Integration tests Speaking AI feedback | US-24 | 3 | QA/BE | BE-03 |
| | | | | **34 SP** | | |

---

## Thứ Tự Phát Triển Gợi Ý (Dependency Graph)

```
Week 1 (Days 1–5):
  Day 1–2:  BE-02 (schema) ──┐
            BE-04 (context)  │
            FE-03 (timer UX) │   ← Không có dependency, chạy song song
            FE-04 (error)    │
            FE-06 (component)│
                             │
  Day 3–5:  BE-01 (ai-service endpoint) ──────────────────────┐
            BE-05 (requireSkill middleware)  ← DD-03 sau BE-01 │

Week 2 (Days 6–10):
  Day 6–7:  BE-03 (PATCH endpoint) ── cần BE-01 + BE-02       │
            DD-01 (DB verify)                                  │
            DD-02 (Gateway verify)                             │
                                                               │
  Day 8–9:  FE-01 (History AI section) ── cần FE-06           │
            FE-02 (Teacher button)     ── cần BE-03           ─┘
            FE-05 (Skill gate)         ── cần BE-05
  
  Day 10:   DD-04 (Integration tests) ── cần BE-03
            Sprint Review + Demo
```

---

## Definition of Done (DoD) cho Sprint này

- [ ] `POST /api/ai/grade-speaking` trả về JSON feedback trong < 30 giây (p95)
- [ ] `PATCH /api/speaking/:id/ai-feedback` trả HTTP 400 nếu submission còn `Pending`
- [ ] Field `aiFeedback` persist đúng trong MongoDB và xuất hiện trong GET response
- [ ] Student thấy AI Feedback section trong lịch sử sau khi Teacher đã kích hoạt
- [ ] Student KHÔNG thể tự gọi PATCH endpoint (HTTP 403)
- [ ] `keyString` không xuất hiện trong bất kỳ response nào
- [ ] Upload audio thất bại → không tạo submission record
- [ ] Học sinh gói FREE nhận modal nâng cấp thay vì lỗi 403 bí ẩn
- [ ] Tất cả integration tests xanh (`npm test` trong speaking-service)
- [ ] Docker Compose `docker compose up -d --build` không có lỗi

---

*Tài liệu được tạo bởi Tech Lead dựa trên phân tích trực tiếp mã nguồn (speaking-service · ai-service · auth-service · frontend). Các task đã loại bỏ những gì đã implement trong Sprint 4 để tránh duplicate work.*
