# Thiết kế Domain & Service
## Nền tảng Luyện thi IELTS — Domain-Driven Design

> **Phiên bản:** 1.0 · **Kiến trúc:** Microservices · Bounded Context per Service  
> **Pattern:** Database-per-Service · Event-Driven (RabbitMQ) · Internal REST

---

## 1. Bản đồ Bounded Context

```mermaid
graph TD
    subgraph "Identity Domain"
        AUTH[auth-service\n:3001\nMongoDB: ielts_auth]
    end

    subgraph "Content Domain"
        READ[reading-service\n:3002\nMongoDB: ielts_reading]
        LISTEN[listening-service\n:3003\nMongoDB: ielts_listening]
        WRITE[writing-service\n:3004\nMongoDB: ielts_writing]
        SPEAK[speaking-service\n:3008\nMongoDB: ielts_speaking]
        LESSON[lesson-service\n:3007\nMongoDB: ielts_lessons]
    end

    subgraph "Exam Orchestration Domain"
        EXAM[exam-service\n:3013\nMongoDB: ielts_exam]
    end

    subgraph "Commerce Domain"
        BILL[billing-service\n:3005\nMongoDB: ielts_billing]
        PAY[payment-service\n:3009\nMongoDB: ielts_payment]
    end

    subgraph "AI Domain"
        AI[ai-service\n:3012\nPython/FastAPI]
    end

    subgraph "Engagement Domain"
        NOTIF[notification-service\n:3011\nMongoDB: ielts_notifications]
        MEDIA[cloud-media-service\n:3010\nCloudinary]
    end

    subgraph "Infrastructure"
        GW[api-gateway\n:3000\nHTTP Reverse Proxy]
        REDIS[(Redis :6379\nJWT Cache + Rate Limit)]
        MQ[(RabbitMQ :5672\nExchange: ielts_events)]
    end

    GW --> AUTH
    GW --> READ
    GW --> LISTEN
    GW --> WRITE
    GW --> SPEAK
    GW --> EXAM
    GW --> BILL
    GW --> PAY
    GW --> NOTIF
    GW --> AI
    GW --> MEDIA
    GW --> LESSON

    AUTH <-.->|Internal REST| AI
    BILL <-.->|Internal REST| AUTH
    PAY <-.->|Internal REST| AUTH
    AUTH -.->|JWT Verify| GW

    GW --- REDIS

    WRITE -->|Publish| MQ
    SPEAK -->|Publish| MQ
    READ -->|Publish| MQ
    LISTEN -->|Publish| MQ
    AUTH -->|Publish| MQ
    PAY -->|Publish| MQ
    BILL -->|Publish| MQ

    MQ -->|Consume| NOTIF

    style AUTH fill:#dbeafe,stroke:#3b82f6
    style EXAM fill:#fef3c7,stroke:#f59e0b
    style AI fill:#d1fae5,stroke:#10b981
    style MQ fill:#ede9fe,stroke:#8b5cf6
    style GW fill:#fee2e2,stroke:#ef4444
```

---

## 2. Phân tích từng Bounded Context

### 2.1 Identity Domain — `auth-service`

**Trách nhiệm chính:**
- Quản lý vòng đời người dùng (đăng ký, đăng nhập, phân quyền)
- Phát hành & xác thực JWT
- Lưu trữ thông tin subscription VIP (`vipValidUntil`, `subscriptionPlan`)
- Lưu `SystemConfig` toàn cục (Gemini API Key, prompt templates)

**Cơ chế liên dịch vụ:**
```mermaid
graph LR
    A[Dịch vụ khác] -->|POST /api/internal/users/batch| AUTH[auth-service]
    B[payment-service / billing-service] -->|PATCH /internal/users/:id/subscription| AUTH
    C[ai-service] -->|GET /api/internal/system-config| AUTH
    AUTH -->|select: false trên geminiApiKey| D[Key không bao giờ lộ ra client]
```

| Internal Endpoint | Caller | Mục đích |
|:-----------------|:-------|:---------|
| `POST /internal/users/batch` | notification, billing | Lấy thông tin nhiều user theo IDs |
| `PATCH /internal/users/:id/subscription` | payment, billing | Cập nhật VIP sau thanh toán |
| `GET /api/internal/system-config` | ai-service | Lấy Gemini API Key + prompts |
| `POST /api/internal/system-config/quota-exhausted` | ai-service | Báo hết quota token |

---

### 2.2 Content Domain — 4 Skill Services

**Pattern chung** cho cả 4 service (reading, listening, writing, speaking):

```mermaid
graph TD
    TC[Teacher/Admin] -->|CRUD API| TESTS[(Test Collection)]
    STUDENT[Student] -->|Submit| SUBMIT[(Submission / Attempt Collection)]
    SUBMIT -->|Auto-grade R/L| RESULT[Band Score]
    SUBMIT -->|Manual queue W/S| TEACHER_Q[Teacher Review Queue]
    TEACHER_Q -->|Grade + Feedback| GRADED[status: Graded]
```

| Service | Auto-grade? | Submission Model | Grading Criteria |
|:--------|:-----------|:-----------------|:-----------------|
| reading-service | ✅ Tức thì | `ReadingAttempt` | rawScore → bandScore |
| listening-service | ✅ Tức thì | `ListeningAttempt` | rawScore → bandScore |
| writing-service | ❌ Manual | `WritingSubmission` | TR + CC + LR + GRA (0–9 each) |
| speaking-service | ❌ Manual | `SpeakingSubmission` | FC + LR + GRA + PR (0–9 each) |

---

### 2.3 Exam Orchestration Domain — `exam-service`

**Đây là Orchestrator trung tâm** — quản lý toàn bộ luồng Mock Test 4 kỹ năng.

```mermaid
graph TD
    subgraph "exam-service chứa"
        EX[Exam\nstatus: DRAFT→PUBLISHED]
        EA[ExamAttempt\nglobalStartTime, globalEndTime\nstatus: IN_PROGRESS→SUBMITTED]
        SA[SkillAttempt x4\nskillType: reading/listening/writing/speaking\nstatus: NOT_STARTED→IN_PROGRESS→SUBMITTED]
    end

    EX -->|skillRefs: readingId, listeningId, writingId, speakingId| REF[String IDs - Loose Coupling]
    REF -.->|Không dùng ObjectId ref| EXT[Các service bên ngoài]

    EA --> SA
    SA -->|autoSubmitted = true nếu hết giờ| AUTO[Auto-submit khi deadlineAt]
```

**Lý do dùng String ID (không phải ObjectId ref):**
> Exam-service **không import model từ service khác** — dùng String để giữ loose coupling giữa các bounded context.

---

### 2.4 Commerce Domain

```mermaid
graph TD
    subgraph "billing-service"
        PLAN[Plan\ncode, price, durationMonths\nbenefits: skills[], maxFullTests]
        SUB[Subscription\nuserId, planId, status\nvalidUntil, cancellationReason]
    end

    subgraph "payment-service"
        TX[Transaction\norderId, userId, amount VND\nstatus: Pending→Success/Failed\ntransId: MoMo txn ID]
    end

    PLAN --> SUB
    TX -->|Admin approve| SUB
    SUB -->|PATCH /internal/users/:id/subscription| AUTH[auth-service\ncập nhật vipValidUntil]
```

**Gating access dựa trên Plan:**
- `plan.benefits.skills` → Array các kỹ năng được phép truy cập.
- `plan.benefits.maxFullTests = -1` → Không giới hạn Mock Test.
- `plan.benefits.maxFullTests = 0` → Không được làm Mock Test.

---

### 2.5 AI Domain — `ai-service`

```mermaid
graph TD
    subgraph "ai-service (Python/FastAPI)"
        EP1[POST /grade-writing\nMultipart: content + task + criteria]
        EP2[POST /grade-speaking\nMultipart: audio answers + questions]
        EP3[POST /extract-writing-pdf\npypdf image extraction + Gemini]
        EP4[POST /extract-speaking-pdf\nGemini text extraction]
        EP5[POST /generate-reading\nGemini structured output]
    end

    EP1 --> FETCH[Fetch API Key từ auth-service]
    FETCH --> GEMINI[Google Gemini 2.5 Flash API]
    GEMINI --> JSON[JSON response: band scores + feedback]

    QUOTA[Quota Exhausted?] -->|Best-effort| NOTIFY[POST /internal/system-config/quota-exhausted]
```

---

### 2.6 Engagement Domain

**notification-service:**
```mermaid
graph LR
    MQ[(RabbitMQ\nExchange: ielts_events\nPattern: topic)] -->|Consume| NC[notification.consumer.js]
    NC --> LOG[NotificationLog lưu DB]
    NC --> SOCKET[Socket.io emitToUser - real-time]
    NC --> EMAIL[SendGrid email]
    NC --> DLX[Dead Letter Queue nếu > 3 lần retry]
```

**Binding keys đang subscribe:**

| Routing Key | Trigger |
|:-----------|:--------|
| `auth.user.registered` | Gửi email chào mừng + in-app |
| `writing.submission.created` | Báo Teacher có bài chờ |
| `writing.grading.completed` | Báo Student bài đã chấm |
| `speaking.submission.created` | Báo Teacher có bài Speaking |
| `speaking.grading.completed` | Báo Student Speaking đã chấm |
| `payment.transaction.approved` | VIP kích hoạt thành công |
| `payment.transaction.rejected` | Thanh toán bị từ chối |
| `payment.transaction.declared` | Học viên đã khai báo thanh toán |
| `reading.test.completed` | Hoàn thành Reading |
| `listening.test.completed` | Hoàn thành Listening |
| `billing.subscription.*` | Huỷ hoặc khôi phục VIP |

---

## 3. Context Map — Quan hệ giữa các Domain

```mermaid
graph TD
    ID[Identity Domain] -->|Shared Kernel: JWT + role| ALL[Tất cả Services]
    ID -->|Conformist: Internal REST| COM[Commerce Domain]
    ID -->|Conformist: Internal REST| AI[AI Domain]
    CON[Content Domain] -->|Published Events → RabbitMQ| ENG[Engagement Domain]
    COM[Commerce Domain] -->|Published Events → RabbitMQ| ENG
    ID -->|Published Events → RabbitMQ| ENG
    EXAM[Exam Orchestration Domain] -->|String ID refs| CON
    EXAM -->|Published Events| ENG
    CON -->|HTTP call for AI grading| AI
```

| Quan hệ | Pattern | Mô tả |
|:--------|:--------|:------|
| Content → Engagement | **Published Language** | Publish RabbitMQ events chuẩn hoá |
| Commerce → Identity | **Conformist** | Tuân theo API internal của auth-service |
| Exam → Content | **Anticorruption Layer** | Dùng String ID thay ObjectId để cách ly |
| All → Identity | **Shared Kernel** | JWT schema và role enum dùng chung |

---

## 4. API Gateway — Routing Table

| Path Prefix | Upstream Service | Port |
|:-----------|:-----------------|:-----|
| `/api/auth` | auth-service | 3001 |
| `/api/users` | auth-service | 3001 |
| `/api/reading` | reading-service | 3002 |
| `/api/listening` | listening-service | 3003 |
| `/api/writing` | writing-service | 3004 |
| `/api/billing` | billing-service | 3005 |
| `/api/lessons` | lesson-service | 3007 |
| `/api/speaking` | speaking-service | 3008 |
| `/api/payment` | payment-service | 3009 |
| `/api/media` | cloud-media-service | 3010 |
| `/api/notifications` | notification-service | 3011 |
| `/api/ai` | ai-service | 3012 |
| `/api/exam` | exam-service | 3013 |

**Redis tại API Gateway:**
- `JWT Blacklist` — lưu token đã logout
- `Rate Limiting` — chống brute force login

---

## 5. Event Schema — RabbitMQ

**Exchange:** `ielts_events` (type: `topic`, durable: true)  
**Dead Letter Exchange:** `ielts_events_dlx` (type: `fanout`)  
**Max Retries:** 3 lần trước khi vào DLQ

```mermaid
sequenceDiagram
    participant PUB as Publisher Service
    participant EX as Exchange: ielts_events
    participant Q as notification_queue
    participant CON as notification.consumer
    participant DLQ as notification_queue_dlq

    PUB->>EX: Publish(routingKey, {userId, metadata})
    EX->>Q: Route by topic pattern
    Q->>CON: Deliver message
    alt Xử lý thành công
        CON-->>Q: ack()
    else Thất bại (retry < 3)
        CON-->>Q: nack() → requeue
    else Thất bại (retry >= 3)
        CON-->>DLQ: Forward to DLQ
    end
```
