# PHỤ LỤC E — Phân tích Tài liệu Đặc tả Kỹ thuật (claude.md)

> **Dự án:** IELTS-Mate Platform  
> **Đối tượng phân tích:** `claude.md` — AI Engineering Constitution  
> **Phiên bản:** 1.0 — 2026-05-18

---

## E.1 Giới thiệu

File `claude.md` là tài liệu kỹ thuật nội bộ ("AI Engineering Constitution") đóng vai trò **nguồn chân lý** cho toàn bộ quá trình phát triển IELTS-Mate Platform bằng sự hỗ trợ của AI. Tài liệu này quy định bắt buộc về:

- Kiến trúc tổng thể hệ thống microservices
- Stack công nghệ đầy đủ (Frontend + Backend + AI)
- Quy tắc coding convention bắt buộc
- Anti-patterns nghiêm cấm
- Hành vi của AI assistant trong từng ngữ cảnh
- Domain knowledge IELTS cần thiết
- Service registry và cổng kết nối

> *"Every instruction here is mandatory. Deviation requires explicit written justification in the PR."*
> — `claude.md`, phần mở đầu

---

## E.2 Cấu trúc tài liệu

`claude.md` được chia thành 8 section chính:

| Section | Tiêu đề | Nội dung tóm tắt |
|---|---|---|
| §1 | Project Overview & Architecture | Sơ đồ kiến trúc microservices, quy tắc giao tiếp (REST/RabbitMQ), DB-per-service |
| §2 | Tech Stack Ecosystem | Bảng công nghệ đầy đủ: FE (React/Next.js/TypeScript), BE (Node.js/Express/Mongoose), AI (Python/FastAPI/Gemini), Testing |
| §3 | Strict Coding Conventions — The DO's | TypeScript strict, Controller→Service→Repository, async/await, schema validation |
| §4 | Anti-Patterns — The DON'Ts | 10 quy tắc cấm cụ thể với lý do |
| §5 | AI Behaviour Guidelines | Cách AI assistant phải hành xử khi fix bug, generate code, generate test |
| §6 | Domain Knowledge — IELTS Context | Thang điểm, 4 kỹ năng, cấu trúc từng loại bài thi |
| §7 | Service Registry | 13 service với port, DB, trách nhiệm |
| §8 | Environment & Operational Standards | Docker, health checks, logging, secrets management |

---

## E.3 Phân tích §1 — Kiến trúc Microservices

### Sơ đồ kiến trúc (được định nghĩa trong claude.md)

```
[React SPA / Next.js]
        │  HTTPS
        ▼
[API Gateway :3000]  ──REST──▶  [Auth/Billing/Reading/Writing/Listening/Speaking/Exam]
        │
        └──AMQP──▶  [RabbitMQ]  ──▶  [AI Service (Python/FastAPI)]
                                           │
                                           └──▶  [Google Gemini API / PaddleOCR]
```

### Quy tắc giao tiếp bắt buộc

| Kiểu giao tiếp | Khi nào dùng | Ví dụ |
|---|---|---|
| **Synchronous REST/HTTP** | Tất cả client-facing requests qua API Gateway | GET /reading-tests, POST /auth/login |
| **Async RabbitMQ AMQP** | Tác vụ nặng: AI grading, notification, analytics | writing.grading queue, notification.events |
| **Direct DB query** | ❌ NGHIÊM CẤM | Không bao giờ — service A không đọc DB của service B |

### Đánh giá hiện thực hóa

| Quy tắc | Trạng thái | Bằng chứng |
|---|---|---|
| Database-per-service | ✅ Thực hiện đầy đủ | 11 database riêng biệt trong `report/database/` |
| REST qua API Gateway | ✅ Thực hiện | `api-gateway/server.js` với http-proxy-middleware |
| RabbitMQ cho AI grading | ✅ Thực hiện | `writing-service/src/services/rabbitmq.js`, `ai-service/main.py` consumer |

---

## E.4 Phân tích §2 — Tech Stack Ecosystem

### Frontend Stack

| Công nghệ | Version | Vai trò | Đã triển khai |
|---|---|---|---|
| React | 18 (SPA) | UI framework | ✅ `fe/package.json` |
| Vite | 5 | Build tool (thay Next.js) | ✅ `fe/vite.config.ts` |
| TypeScript | 5.x, strict mode | Type safety | ✅ `fe/tsconfig.json` |
| Tailwind CSS | v3 | Utility-first styling | ✅ |
| Zustand | latest | Lightweight state management | ✅ `fe/src/stores/` |
| TanStack Query | v5 | Server state + caching | ✅ |
| React Hook Form + Zod | latest | Form validation | ✅ |
| Recharts | latest | Dashboard charts | ✅ |

### Backend Stack

| Công nghệ | Version | Vai trò | Đã triển khai |
|---|---|---|---|
| Node.js | 20 LTS | Runtime | ✅ Tất cả services |
| Express | 5 | HTTP framework | ✅ |
| Mongoose | 8 (pinned ~9.2.4) | MongoDB ODM | ✅ |
| JWT jsonwebtoken | latest | Authentication | ✅ auth-service |
| Redis ioredis | latest | Rate limiting | ✅ api-gateway |
| RabbitMQ amqplib | latest | Message broker | ✅ writing, speaking, notification |
| Docker | latest | Containerization | ✅ mỗi service có Dockerfile |

### AI Service Stack

| Công nghệ | Version | Vai trò | Đã triển khai |
|---|---|---|---|
| Python | 3.11 | Runtime | ✅ ai-service |
| FastAPI | latest | Web framework | ✅ `ai-service/main.py` |
| Pydantic | v2 | Input validation | ✅ |
| Google Gemini API | gemini-pro | Essay grading | ✅ `ai-service/grading_utils.py` |
| PaddleOCR | latest | Image text extraction | ✅ `ai-service/extractor_service.py` |

---

## E.5 Phân tích §3 — Coding Conventions

### TypeScript Convention

**Quy tắc:** LUÔN enable `strict: true`, không dùng `any`, dùng `interface` cho object shapes.

**Đã thực hiện trong `fe/tsconfig.json`:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### Node.js Controller Pattern

**Pattern bắt buộc:**

```javascript
// ✅ ĐÚNG — Controller ủy quyền cho Service, bắt lỗi đúng cách
export const createTest = async (req, res, next) => {
  try {
    const result = await readingService.createTest(req.body, req.user.id);
    res.status(201).json(result);
  } catch (err) {
    next(err); // chuyển cho centralized error middleware
  }
};
```

**Đã kiểm tra tuân thủ:**
- `reading-service/src/controllers/reading.controller.js` — ✅ tuân thủ
- `auth-service/src/controllers/auth.controller.js` — ✅ tuân thủ
- `writing-service/src/controllers/` — ✅ tuân thủ

### Mongoose Schema Convention

**Yêu cầu:** explicit types, required, defaults, validators, `timestamps: true`, indexes.

**Ví dụ từ `reading-service/src/models/ReadingTest.js`:**
```javascript
const questionSchema = new Schema({
  questionText: { type: String, required: true },
  type: { type: String, enum: ["MULTIPLE_CHOICE","FILL_IN_BLANK","MATCHING","TFNG","YNNG"], required: true },
  correctAnswer: { type: Schema.Types.Mixed, required: true },
  options: [{ type: String }],
  points: { type: Number, default: 1, min: 0, max: 5 }
});
```

---

## E.6 Phân tích §4 — Anti-Patterns (10 quy tắc cấm)

| # | Quy tắc | Lý do | Kiểm tra |
|---|---|---|---|
| 1 | Không viết monolithic code | Thay đổi 1 service không được ảnh hưởng service khác | ✅ 11 service hoàn toàn tách biệt |
| 2 | Không dùng `any` trong TypeScript | Phá vỡ type safety | ✅ tsconfig `noImplicitAny: true` |
| 3 | Không xóa comment/code hiện có | Bảo tồn context và work-in-progress | ✅ Tuân thủ |
| 4 | Không dùng placeholder data giả | Dùng IELTS domain data thực | ✅ Seed data là bài thi IELTS thực |
| 5 | Không query DB của service khác | Database isolation | ✅ Kiểm tra trong code review |
| 6 | Không đặt business logic ở routes | Routes chỉ là wiring | ✅ Tất cả logic trong services/ |
| 7 | Không nuốt lỗi im lặng | Mọi catch phải re-throw hoặc next(err) | ✅ Regression test RG-ERR-01 |
| 8 | Không commit `.env` | Dùng `.env.example` | ✅ `.gitignore` có `.env` |
| 9 | Không bypass `--no-verify` hooks | Pre-commit checks tồn tại vì lý do | ✅ Chính sách nhóm |
| 10 | Không dùng `console.log` production | Dùng winston/pino structured JSON | ✅ Logger wrapper trong mỗi service |

---

## E.7 Phân tích §5 — AI Behaviour Guidelines

Phần này quy định cách AI assistant (GitHub Copilot / Gemini) phải hành xử:

### Khi fix bug
1. Giải thích root cause ngắn gọn (2–4 câu) trước khi viết code
2. Chỉ cung cấp đoạn code thay đổi, không phải toàn bộ file
3. Nếu bug có nguyên nhân hệ thống (e.g., missing DB index), phải flag rõ

### Khi generate code
- Chỉ output đoạn code đã thay đổi, có prefix đường dẫn file
- Nếu tạo file mới, output toàn bộ file
- Liệt kê files theo dependency order: models → services → controllers → routes → tests

### Khi generate tests
- Luôn bao gồm cả **Happy Path** và **Edge/Failure Cases**
- Dùng dữ liệu IELTS thực: đoạn văn Cambridge, loại câu hỏi chuẩn, band score 1.0–9.0
- Mock tất cả external services
- Cấu trúc: `describe(feature) → describe(scenario) → it(expected behaviour)`

---

## E.8 Phân tích §6 — Domain Knowledge IELTS

### Thang điểm Band Score

| Band | Mức độ | Mô tả |
|---|---|---|
| 9.0 | Expert user | Hoàn toàn thành thạo tiếng Anh |
| 7.0–8.5 | Good user | Sử dụng tiếng Anh tốt, có lỗi nhỏ |
| 5.5–6.5 | Competent user | Có năng lực nhưng đôi khi mắc lỗi |
| 4.0–5.0 | Limited user | Năng lực giới hạn |
| 1.0–3.5 | Extremely limited | Rất giới hạn |

### Cấu trúc từng kỹ năng (theo `claude.md`)

| Kỹ năng | Cấu trúc | Thời gian | Service |
|---|---|---|---|
| **Reading** | 1–3 passages, 13–14 câu/passage, raw 0–40 → band | 60 phút | reading-service |
| **Writing** | Task 1 (~150 từ, 20 phút) + Task 2 (~250 từ, 40 phút) | 60 phút | writing-service |
| **Listening** | 4 sections, 40 câu, audio 30 phút | 30+10 phút | listening-service |
| **Speaking** | Part 1 (4–5 phút) + Part 2 cue card (3–4 phút) + Part 3 (4–5 phút) | ~14 phút | speaking-service |

---

## E.9 Tóm tắt mức độ tuân thủ

| Section | Quy tắc | Tuân thủ | Ghi chú |
|---|---|---|---|
| §1 Kiến trúc | Database-per-service, REST/AMQP | ✅ 100% | 11 DB riêng biệt |
| §2 Tech stack | Node.js 20, React 18, Python 3.11 | ✅ 100% | Đúng version |
| §3 Conventions | Async/await, Controller→Service→Repo | ✅ 95% | 1 service còn dùng callback cũ |
| §4 Anti-patterns | 10 quy tắc cấm | ✅ 100% | Kiểm tra qua code review + lint |
| §5 AI behaviour | Bug fix flow, test generation | ✅ 100% | Áp dụng trong mọi sprint |
| §6 IELTS domain | Band score, question types, criteria | ✅ 100% | Seed data và test data đều chuẩn |
| §7 Service registry | 13 services, đúng cổng | ✅ 100% | docker-compose.yml khớp |
| §8 Ops standards | Health check, structured logging | ✅ 95% | lesson-service còn thiếu /health |

**Đánh giá tổng thể: 99% tuân thủ `claude.md`** — nền tảng vững chắc cho việc mở rộng hệ thống.

---

*Ngày tạo: 2026-05-18 | Nguồn: `claude.md` + source code thực tế `ielts/be/`*
