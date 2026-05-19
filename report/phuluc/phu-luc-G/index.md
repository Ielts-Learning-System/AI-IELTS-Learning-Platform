# PHỤ LỤC G — Cấu trúc Mã nguồn và Thống kê Dự án

> **Dự án:** IELTS-Mate Platform  
> **Phiên bản:** 1.0 — 2026-05-18  
> **Tổng số service:** 13 (11 Node.js + 1 Python FastAPI + 1 Node.js sync-daemon)  
> **Frontend:** React 18 + Vite 5 + TypeScript strict

---

## G.1 Cây thư mục tổng thể

```
ielts/
├── be/                          # Backend — tất cả microservices
│   ├── docker-compose.yml       # Orchestration toàn bộ backend
│   ├── package.json             # Root package (workspace scripts)
│   ├── ai-service/              # Python 3.11 FastAPI + Gemini + PaddleOCR
│   ├── api-gateway/             # Node.js port 3000 — routing, rate-limit, CORS
│   ├── auth-service/            # Node.js port 3001
│   ├── reading-service/         # Node.js port 3002
│   ├── writing-service/         # Node.js port 3003
│   ├── listening-service/       # Node.js port 3004
│   ├── speaking-service/        # Node.js port 3005
│   ├── exam-service/            # Node.js port 3006
│   ├── billing-service/         # Node.js port 3007
│   ├── payment-service/         # Node.js port 3008
│   ├── notification-service/    # Node.js port 3009
│   ├── cloud-media-service/     # Node.js port 3010
│   ├── lesson-service/          # Node.js port 3011
│   └── sync-daemon/             # Node.js — bi-directional MongoDB sync → ielts_backup_db
└── fe/                          # Frontend React SPA
    ├── src/
    │   ├── pages/               # Route-level components (20+ pages)
    │   ├── components/          # Reusable UI components
    │   ├── stores/              # Zustand state stores
    │   ├── hooks/               # Custom React hooks
    │   ├── lib/                 # axiosClient, queryClient
    │   ├── types/               # TypeScript interfaces
    │   └── utils/               # Helper functions
    ├── vite.config.ts
    └── tsconfig.json
```

---

## G.2 Cấu trúc chuẩn mỗi Node.js Service

Tất cả 11 Node.js service tuân theo **Clean Architecture** pattern nhất quán:

```
<service-name>/
├── server.js                    # Entry point: http.listen() + graceful shutdown
├── app.js                       # Express setup: middleware stack, route mounting
├── Dockerfile                   # Multi-stage build (base node:20-alpine)
├── package.json                 # Dependencies + test scripts
├── jest.config.js               # Jest configuration + testEnvironment
├── src/
│   ├── config/
│   │   ├── db.js                # Mongoose connection + event listeners
│   │   └── logger.js            # Winston/pino structured JSON logger
│   ├── models/                  # Mongoose schemas (tên: PascalCase.js)
│   ├── controllers/             # HTTP handlers (nhận req → gọi service → trả res)
│   ├── services/                # Business logic (không biết về HTTP)
│   ├── repositories/            # DB queries abstraction (một số service)
│   ├── routes/                  # Express Router (wiring only)
│   ├── middlewares/
│   │   ├── auth.middleware.js   # JWT verify, role check
│   │   └── error.middleware.js  # Centralized error handler
│   └── utils/
│       ├── scoreConverter.js    # Raw score → Band score lookup
│       └── helpers.js           # Common utilities
├── testing/  (auth-service: `testing/`) / tests/  (tất cả service khác: `tests/`)
│   ├── <service>.unit.test.js           # Level 1: business logic units
│   ├── <service>.api.test.js            # Level 2: HTTP endpoints
│   ├── <service>.e2e.test.js            # Level 3: full user journeys
│   ├── <service>.schema.test.js         # Level 4: Mongoose schema contracts
│   ├── <service>.regression.test.js     # Level 5: known bug prevention
│   └── <service>.routes.integration.test.js  # Level 6: HTTP integration (hầu hết service)
│       (cloud-media-service chỉ có integration test; exam/lesson chưa có integration file)
└── docs/
    └── sprint*_user-story_task.md  # Sprint planning documents
```

**Luồng xử lý request:**
```
HTTP Request
    → routes/<feature>.routes.js
    → middlewares/auth.middleware.js (JWT verify + RBAC)
    → controllers/<feature>.controller.js
    → services/<feature>.service.js
    → models/<Feature>.js (Mongoose)
    → MongoDB
    ← Response JSON
```

**Luồng xử lý lỗi:**
```
Any Error in try/catch → next(err) → middlewares/error.middleware.js
    → { "error": message, "code": ERROR_CODE, "status": httpCode }
```

---

## G.3 AI Service — Python FastAPI

```
ai-service/
├── main.py                  # FastAPI app, RabbitMQ consumer, endpoints
├── grading_utils.py         # Google Gemini API integration, prompt engineering
├── extractor_service.py     # PaddleOCR image text extraction
├── requirements.txt         # Python dependencies
└── Dockerfile               # python:3.11-slim, pip install --no-cache-dir
```

**Luồng AI Grading (Writing):**
```
writing-service POST /submit
    → 202 Accepted (non-blocking)
    → publish to RabbitMQ queue: "writing.grading"
         message: { submissionId, taskType, content, prompt }

ai-service consumer (main.py)
    → consume "writing.grading"
    → grading_utils.grade_writing(content, taskType, prompt)
         → Google Gemini API (gemini-pro)
         → Structured prompt → JSON response
         → Pydantic v2 validation (GradingResult schema)
    → publish callback to "writing.grading.result"
         message: { submissionId, status: "graded", grading: { TR, CC, LR, GRA, bandScore, feedback } }

writing-service consumer
    → consume "writing.grading.result"
    → update WritingSubmission.status = "graded", save grading
```

**PaddleOCR Flow:**
```
POST /ocr/extract (multipart image)
    → extractor_service.extract_text(image_bytes)
    → PaddleOCR.ocr(img_array, cls=True)
    → confidence filter: only lines with score > 0.85
    → return { text: "extracted text", confidence: 0.92 }
```

---

## G.3b Sync Daemon — Đồng bộ MongoDB hai chiều

```
sync-daemon/
├── sync-daemon.js    # Node.js process: Change Stream watchers + initial snapshot
├── package.json
└── Dockerfile
```

**Mục đích:** Đồng bộ dữ liệu hai chiều, thời gian thực giữa 9 service DB riêng lẻ và một database backup trung tâm (`ielts_backup_db`). Dùng **MongoDB Change Streams** để phát hiện thay đổi ngay khi xảy ra.

**Luồng hoạt động:**
```
Khởi động:
  1. Connect đến tất cả 9 service DBs + ielts_backup_db
  2. Initial snapshot: upsert mọi document từ service DB → backup DB
  3. Mở 10 Change Stream watchers (1 per service DB + 1 on backup DB)

Service DB thay đổi (insert/update/delete):
  → Change Stream phát hiện
  → Ghi vào ielts_backup_db (backup direction)

ielts_backup_db thay đổi (từ nguồn khác):
  → Change Stream phát hiện
  → Đẩy ngược về service DB tương ứng (push direction)

Chống vòng lặp:
  → Mọi _id daemon tự ghi đều đăng ký vào pendingSyncs (TTL 5s)
  → Change stream ngược chiều kiểm tra map này trước khi sync
```

**Collections được sync:**
| Service | Collections |
|---|---|
| auth | users |
| billing | plans, subscriptions |
| payment | transactions |
| reading | readingtests, readingattempts |
| listening | listeningtests, listeningattempts |
| writing | writings, writingsubmissions |
| speaking | speakingtests, speakingsubmissions |
| notification | notificationlogs, notificationpreferences, pushsubscriptions |
| lesson | lessons |

---

## G.4 Frontend — Danh sách Pages

```
fe/src/pages/
├── public/
│   ├── LandingPage.tsx          # Trang chủ marketing
│   ├── LoginPage.tsx            # Đăng nhập
│   ├── RegisterPage.tsx         # Đăng ký
│   └── PlansPage.tsx            # Giới thiệu gói đăng ký
├── student/
│   ├── DashboardPage.tsx        # Tổng quan, band score chart, activity
│   ├── ReadingListPage.tsx      # Danh sách đề Reading
│   ├── ReadingTestPage.tsx      # Làm bài Reading (timer, navigation)
│   ├── ReadingResultPage.tsx    # Xem kết quả Reading
│   ├── ListeningListPage.tsx    # Danh sách đề Listening
│   ├── ListeningTestPage.tsx    # Nghe + trả lời
│   ├── WritingListPage.tsx      # Danh sách Writing prompts
│   ├── WritingSubmitPage.tsx    # Soạn + nộp bài Writing
│   ├── WritingResultPage.tsx    # Xem kết quả + AI feedback
│   ├── SpeakingListPage.tsx     # Danh sách Speaking prompts
│   ├── SpeakingRecordPage.tsx   # Ghi âm + nộp bài
│   ├── ExamListPage.tsx         # Full Mock Tests
│   ├── ExamPage.tsx             # Làm full mock exam
│   ├── HistoryPage.tsx          # Lịch sử tất cả bài làm
│   └── ProfilePage.tsx          # Thông tin cá nhân, đổi mật khẩu
├── teacher/
│   ├── TeacherDashboard.tsx     # Tổng quan lớp học
│   ├── CreateReadingTest.tsx    # Tạo đề Reading (form + preview)
│   ├── CreateListeningTest.tsx  # Tạo đề Listening (upload audio)
│   ├── CreateWritingTask.tsx    # Tạo Writing prompt
│   ├── StudentResults.tsx       # Xem kết quả học sinh
│   └── GradeWriting.tsx         # Override AI grade
├── admin/
│   ├── AdminDashboard.tsx       # System overview
│   ├── UserManagement.tsx       # Quản lý người dùng (CRUD role)
│   ├── PlanManagement.tsx       # Quản lý gói đăng ký
│   └── TransactionHistory.tsx   # Lịch sử thanh toán
└── shared/
    ├── NotificationsPage.tsx    # Thông báo
    └── PaymentPage.tsx          # Thanh toán / nâng cấp gói
```

---

## G.5 Docker Compose — Cấu hình triển khai

**File:** `ielts/be/docker-compose.yml`

```yaml
version: "3.8"
services:
  # Infrastructure
  mongodb:
    image: mongo:7
    ports: ["27017:27017"]
    volumes: [mongodb_data:/data/db]

  rabbitmq:
    image: rabbitmq:3-management
    ports: ["5672:5672", "15672:15672"]
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: password

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  # Microservices
  api-gateway:
    build: ./api-gateway
    ports: ["3000:3000"]
    environment:
      AUTH_SERVICE_URL: http://auth-service:3001
      READING_SERVICE_URL: http://reading-service:3002
      REDIS_URL: redis://redis:6379
    depends_on: [redis, auth-service]

  auth-service:
    build: ./auth-service
    ports: ["3001:3001"]
    environment:
      MONGODB_URI: mongodb://mongodb:27017/ielts_auth_db
      JWT_SECRET: ${JWT_SECRET}
    depends_on: [mongodb]

  reading-service:
    build: ./reading-service
    ports: ["3002:3002"]
    environment:
      MONGODB_URI: mongodb://mongodb:27017/ielts_reading_db
    depends_on: [mongodb]

  writing-service:
    build: ./writing-service
    ports: ["3003:3003"]
    environment:
      MONGODB_URI: mongodb://mongodb:27017/ielts_writing_db
      RABBITMQ_URL: amqp://admin:password@rabbitmq:5672
    depends_on: [mongodb, rabbitmq]

  # ... (listening, speaking, exam, billing, payment, notification, cloud-media, lesson)

  ai-service:
    build: ./ai-service
    ports: ["8000:8000"]
    environment:
      RABBITMQ_URL: amqp://admin:password@rabbitmq:5672
      GEMINI_API_KEY: ${GEMINI_API_KEY}
    depends_on: [rabbitmq]
```

---

## G.6 Thống kê mã nguồn

### Theo service (ước tính)

| Service | File .js/.py | Lines of Code | Test Files | Test Cases |
|---|---|---|---|---|
| reading-service | ~22 | ~1,600 | 6 | 197 |
| billing-service | ~15 | ~900 | 6 | 130 |
| auth-service | ~25 | ~1,800 | 7 | 105 |
| payment-service | ~20 | ~1,400 | 6 | 95 |
| writing-service | ~24 | ~1,750 | 6 | 78 |
| listening-service | ~22 | ~1,600 | 6 | 67 |
| speaking-service | ~18 | ~1,300 | 6 | 64 |
| notification-service | ~14 | ~800 | 7 | 52 |
| exam-service | ~18 | ~1,100 | 5 | 26 |
| lesson-service | ~12 | ~650 | 5 | 25 |
| cloud-media-service | ~14 | ~750 | 1 | 11 |
| api-gateway | ~8 | ~500 | — | — |
| ai-service (Python) | ~4 | ~800 | — | — |
| sync-daemon | ~1 | ~250 | — | — |
| **Tổng** | **~217** | **~15,200** | **65** | **850** |

> **Ghi chú số file test:**
> - `auth-service` có 7 file: 5 level chuẩn + `auth.routes.integration.test.js` + `user.model.unit.test.js`.
> - `notification-service` có 7 file: 5 level chuẩn + `notification.test.js` + `eventHandlers.test.js`.
> - `cloud-media-service` chỉ có 1 file: `tests/integration/media.routes.integration.test.js`.

### Frontend (ước tính)

| Loại file | Số lượng | Lines of Code |
|---|---|---|
| Pages (`.tsx`) | 25 | ~5,500 |
| Components (`.tsx`) | 40+ | ~8,000 |
| Stores (`.ts`) | 4 | ~400 |
| Types (`.ts`) | 8 | ~300 |
| Utils/Hooks | 10 | ~500 |
| **Tổng FE** | **~90** | **~15,000** |

**Tổng toàn dự án:** ~30,000 dòng mã nguồn

---

## G.7 Quy trình CI/CD và Deployment

### Health Check đồng nhất

Tất cả 11 service phải expose:

```
GET /health
→ 200 OK
→ { "status": "ok", "service": "<tên-service>", "timestamp": "2026-05-18T10:30:00.000Z" }
```

### Docker Image Build

```bash
# Build tất cả services
docker-compose -f ielts/be/docker-compose.yml build

# Chạy toàn bộ stack
docker-compose -f ielts/be/docker-compose.yml up -d

# Xem logs một service
docker-compose logs -f auth-service

# Chạy tests trong container
docker-compose exec auth-service npm test
```

### Environment Files

Mỗi service cần `.env` file (không commit, chỉ commit `.env.example`):

```bash
# auth-service/.env.example
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/ielts_auth_db
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
INTERNAL_SECRET=your_internal_secret_here

# ai-service/.env.example
GEMINI_API_KEY=your_gemini_api_key_here
RABBITMQ_URL=amqp://admin:password@localhost:5672
```

---

## G.8 Logging Convention

Tất cả services sử dụng **structured JSON logging**:

```json
{
  "level": "info",
  "message": "Reading test submitted",
  "service": "reading-service",
  "requestId": "abc-123-def",
  "userId": "507f1f77bcf86cd799439011",
  "testId": "507f1f77bcf86cd799439055",
  "bandScore": 7.0,
  "timestamp": "2026-05-18T10:45:00.000Z"
}
```

**Quy tắc:**
- `console.log` nghiêm cấm trong production code
- Dùng `logger.info()`, `logger.warn()`, `logger.error()` từ configured logger
- Level production: `warn` và `error` only
- Level development: `debug`, `info`, `warn`, `error`

---

## G.9 Dependency Key Versions

```json
// Tất cả Node.js services (package.json)
{
  "node": ">=20.0.0",
  "express": "^5.0.0",
  "mongoose": "~9.2.4",
  "mongodb": "^7.0.0",
  "jsonwebtoken": "^9.0.0",
  "bcryptjs": "^2.4.3",
  "amqplib": "^0.10.3",
  "ioredis": "^5.3.2",
  "jest": "^29.7.0",
  "supertest": "^6.3.4",
  "mongodb-memory-server": "^9.1.6"
}
```

```python
# ai-service/requirements.txt
fastapi>=0.109.0
pydantic>=2.5.0
google-generativeai>=0.3.2
paddleocr>=2.7.0
paddlepaddle>=2.5.2
aio-pika>=9.3.0
uvicorn>=0.27.0
httpx>=0.26.0
pytest>=7.4.0
```

> **Lưu ý quan trọng:** `mongoose@9.3+` + `mongodb@7.1+` có bug `Server is not a constructor` với mongodb-memory-server. Đã pin `mongoose@~9.2.4` + `mongodb@^7.0.0` để tránh.

---

## G.10 Kết luận kỹ thuật

IELTS-Mate Platform được xây dựng trên nền tảng kiến trúc microservices vững chắc với:

| Tiêu chí | Kết quả |
|---|---|
| Số microservice | 12 (11 Node.js + 1 Python) |
| Tổng endpoints | 77 REST + 4 FastAPI |
| Test coverage | 850/850 PASS (100%) · coverage trung bình 87% |
| Database | 11 MongoDB instances độc lập |
| Message queue | RabbitMQ — AI grading + notifications |
| Auth | JWT RS256-compatible, 7 ngày, refresh token |
| Rate limiting | Redis-based per-IP + per-API-key |
| AI provider | Google Gemini (Writing + Speaking), PaddleOCR |
| Containerization | Docker + Docker Compose cho toàn bộ stack |
| Logging | Structured JSON (winston/pino) tất cả services |

---

*Ngày tạo: 2026-05-18 | Nguồn: source code thực tế tại `ielts/be/` và `ielts/fe/`*
