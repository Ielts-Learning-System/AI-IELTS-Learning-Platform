# IELTS Microservices — Manual QA Checklist
## Post DB-per-Service Refactor

Use this checklist after running `docker compose up -d` and the automated E2E scripts.
Check each item manually in a browser and/or Postman.

---

## 0. Pre-Check: Infrastructure Health

- [ ] `docker compose ps` — all 11 containers are **Up** with no `Restarting` state
- [ ] `node test-connections.js` — all 9 MongoDB per-service DBs show ✅
- [ ] `node e2e-health-check.js` — all steps pass
- [ ] RabbitMQ UI accessible at `http://localhost:15672` (guest / guest)
  - [ ] Exchange `ielts_events` (type: topic) exists
  - [ ] Exchange `ielts_events_dlx` (dead-letter) exists
  - [ ] Queue `ielts_notification_queue` is bound to `ielts_events` with key `billing.#`
- [ ] Redis container is running: `docker compose ps redis`

---

## 1. Authentication & Authorization

### 1.1 Registration
- [ ] `POST /api/auth/register` with valid data → 201, returns `token` or `user`
- [ ] Attempt to register with the **same email** again → 409 or 400 (duplicate)
- [ ] Register with missing `email` field → 400 validation error

### 1.2 Login
- [ ] `POST /api/auth/login` with correct credentials → 200 + JWT token
- [ ] Login with **wrong password** → 401
- [ ] Login with **non-existent email** → 401 (do not reveal user existence)

### 1.3 JWT Guard
- [ ] `GET /api/auth/profile` with **no token** → 401 `Unauthorized`
- [ ] `GET /api/auth/profile` with **expired/invalid token** → 401
- [ ] `GET /api/auth/profile` with valid token → 200 + user profile

### 1.4 Admin Role Guard
- [ ] `GET /api/billing/admin/subscriptions` with **student JWT** → 403 `Forbidden`
- [ ] `GET /api/billing/admin/subscriptions` with **admin JWT** → 200
- [ ] `POST /api/billing/admin/subscriptions/:id/cancel` with **student JWT** → 403

---

## 2. Billing & Subscription

### 2.1 Public Plans
- [ ] `GET /api/billing/plans` (no auth) → 200, array of plans with `name`, `price`, `durationMonths`
- [ ] Response contains only **active** plans (`isActive: true`)

### 2.2 My Subscription
- [ ] `GET /api/billing/my-subscription` (new user, no subscription) → 404 or empty `data`
- [ ] After subscribing → returns `{ status: 'ACTIVE', plan: {...}, validUntil: '...' }`

### 2.3 Admin Subscription Management
- [ ] `GET /api/billing/admin/subscriptions` → paginated list, each item has `userId` populated (name/email from auth-service via API Composition)
- [ ] `POST /api/billing/admin/subscriptions/:id/cancel` → 200; subscription `status` flips to `CANCELLED`
  - [ ] Verify auth-service user `subscriptionPlan` field reverts (check via `GET /api/auth/profile` using the affected user's JWT)
  - [ ] Verify `billing.subscription.cancelled` event fires (see Section 6)

---

## 3. Writing Service

### 3.1 Writing Tests (Prompts)
- [ ] `GET /api/writing/` → 200, array of writing prompts with `title`, `type`, `_id`
- [ ] `GET /api/writing/:id` → 200, single prompt

### 3.2 Submission
- [ ] `POST /api/writing/submissions` (no auth) → 401
- [ ] `POST /api/writing/submissions` with JWT + valid `{ writingId, taskType, content }` → 201
  - [ ] `content` word count is stored in `wordCount` field
  - [ ] `taskType` mismatch with the prompt's `type` → 400 error
- [ ] `GET /api/writing/submissions/my-submissions` → lists **only the current user's** submissions (not others')

---

## 4. Reading & Listening Services

### 4.1 Reading
- [ ] `GET /api/reading/tests` → 200, list of tests
- [ ] `POST /api/reading/attempts` with JWT → 201
- [ ] `GET /api/reading/attempts/my-attempts` → returns only user's own attempts

### 4.2 Listening (Dictation)
- [ ] `GET /api/dictation/tests` → 200
- [ ] `POST /api/dictation/attempts` with JWT → 201
- [ ] Audio files served at `/audio/:filename` → 200 with correct Content-Type

---

## 5. Speaking Service

- [ ] `GET /api/speaking/tests` → 200
- [ ] `POST /api/speaking/submissions` with JWT + audio file → 201 (calls Cloudinary)
- [ ] `GET /api/speaking/submissions/my-submissions` → user-scoped results

---

## 6. Payment Service

### 6.1 VietQR Flow
- [ ] `GET /api/payment/transactions` (admin JWT) → list of transactions with user `name`/`email` populated via auth-service batch lookup (not a direct DB join)
- [ ] `POST /api/payment/transactions/:id/approve` (admin JWT):
  - [ ] Transaction status flips to `APPROVED`
  - [ ] Auth-service user's `subscriptionPlan` and `vipValidUntil` are updated via `PATCH /internal/users/:id/subscription`
  - [ ] Billing subscription is created/updated
- [ ] If auth-service is down: `POST /api/payment/transactions/:id/approve` → 502 error (not a silent failure)

---

## 7. Notification Service

### 7.1 Inbox
- [ ] `GET /api/notification/` (unauthenticated) → 200 with `notifications: []` and `pagination` shape
- [ ] `GET /api/notification/` (JWT) → returns notifications scoped to the user
- [ ] `GET /api/notification/unread-count` → `{ unreadCount: N }`

### 7.2 Mark as Read
- [ ] `PATCH /api/notification/:id/read` → 200, `isRead` flips to `true`
- [ ] `PATCH /api/notification/read-all` → 200, all notifications marked read

### 7.3 Real-time WebSocket
- [ ] Open browser at `http://localhost:5173` (or wherever FE is served)
  - [ ] Notification bell icon visible in header
  - [ ] `io("http://localhost:3000", { path: "/socket.io-notification" })` connects (check DevTools → Network → WS)
  - [ ] On admin subscription cancellation: bell badge increments **without page reload**

---

## 8. Lesson Service

- [ ] `GET /api/lessons/` → 200, list of lessons
- [ ] Lesson data comes from `ielts_lesson_db` (not the old shared DB)

---

## 9. Cloud Media Service

- [ ] `POST /api/media/upload` with valid JWT + file → 200, returns Cloudinary URL
- [ ] Reject upload with no auth → 401

---

## 10. Database Isolation Verification

For each service, confirm data goes into the **correct** Atlas database:

| Service | Expected DB |
|---|---|
| auth-service | `ielts_auth_db` |
| billing-service | `ielts_billing_db` |
| payment-service | `ielts_payment_db` |
| reading-service | `ielts_reading_db` |
| listening-service | `ielts_listening_db` |
| writing-service | `ielts_writing_db` |
| speaking-service | `ielts_speaking_db` |
| notification-service | `ielts_notification_db` |
| lesson-service | `ielts_lesson_db` |

Spot-check (via MongoDB Atlas UI or Compass):
- [ ] Register a new user → appears in `ielts_auth_db.users`, NOT in any other DB
- [ ] Submit a writing → appears in `ielts_writing_db.writingsubmissions`
- [ ] Cancel a subscription → `ielts_billing_db.subscriptions` status changes; `ielts_notification_db.notificationlogs` gets a new document

---

## 11. Cross-Service Data Consistency (API Composition)

- [ ] `GET /api/payment/transactions` returns `userName`/`userEmail` fetched from auth-service (not stored in payment DB)
  - Verify by checking a transaction object: it should have user info even though `ielts_payment_db.transactions` only has `userId`
- [ ] After `approveTransaction`, the user's subscription plan visible at `GET /api/auth/profile` matches what was purchased
- [ ] No `users` collection exists in `ielts_payment_db` (check in Atlas)

---

## 12. Regression: Removed Fallback URIs

For each of the following, confirm the service **fails fast** (exits or logs an error) when `MONGO_URI` is unset rather than silently connecting to localhost:

- [ ] `reading-service` — start without `.env` → container exits with error
- [ ] `lesson-service` — start without `.env` → container exits with error
- [ ] `billing-service` (`migrate-db.js`) — run without `MONGO_URI` → prints error and exits 1
- [ ] `billing-service` (`patch-valid-until.js`) — run without `MONGO_URI` → prints error and exits 1

---

## Sign-off

| Reviewer | Date | Status |
|---|---|---|
| | | ☐ Approved / ☐ Needs Work |

> **Notes / Blockers:**
>
> _Add any findings here._
