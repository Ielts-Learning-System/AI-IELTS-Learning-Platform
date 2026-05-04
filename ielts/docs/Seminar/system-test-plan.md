# System Test Plan — IELTS Preparation Platform

> **Version**: 1.0  
> **Created**: Sprint 10 (final sprint)  
> **Scope**: End-to-end cross-service test scenarios  
> **Environment**: Staging (Docker Compose, all services up)

---

## 1. Objective

Validate that the entire platform works correctly when all microservices are deployed together. These tests exercise real HTTP calls across the API Gateway to downstream services with a shared MongoDB instance.

---

## 2. Prerequisites

| Item | Detail |
|------|--------|
| Runtime | Docker Compose up (all services + MongoDB + Redis) |
| Seed data | `seed-reading.js`, `seed-listening.js`, `seed-writing.js`, `seed-billing.js` executed |
| Test runner | Shell scripts / Postman Collection / Newman CLI |
| Network | All services reachable via `http://localhost:3000` (API Gateway) |

---

## 3. Test Scenarios

### 3.1 — Student Registration & Authentication Flow

| # | Step | Method | Endpoint | Expected |
|---|------|--------|----------|----------|
| 1 | Register new student | POST | `/api/auth/register` | 201, token returned, role = `Student` |
| 2 | Register duplicate email | POST | `/api/auth/register` | 400, "already exists" |
| 3 | Login with valid creds | POST | `/api/auth/login` | 200, token returned |
| 4 | Login with wrong password | POST | `/api/auth/login` | 401 |
| 5 | Get profile | GET | `/api/auth/profile` | 200, user details match |

### 3.2 — Reading Test Lifecycle

| # | Step | Method | Endpoint | Expected |
|---|------|--------|----------|----------|
| 1 | Teacher creates reading test | POST | `/api/reading` | 201, test created with passages & questions |
| 2 | Student lists reading tests | GET | `/api/reading` | 200, paginated result |
| 3 | Student views test detail | GET | `/api/reading/:id` | 200, correct answers hidden |
| 4 | Student submits answers | POST | `/api/reading/:id/submit` | 200, score + correctCount returned |
| 5 | Teacher views submissions | GET | `/api/reading` | 200, test still has full data for teacher |

### 3.3 — Listening Test Lifecycle

| # | Step | Method | Endpoint | Expected |
|---|------|--------|----------|----------|
| 1 | Teacher creates listening test | POST | `/api/listening` | 201, parts with questions |
| 2 | Student lists tests | GET | `/api/listening` | 200, paginated |
| 3 | Student views test (no answers) | GET | `/api/listening/:id` | 200, correctAnswer stripped |
| 4 | Student submits answers | POST | `/api/listening/:id/submit` | 200, auto-graded score |

### 3.4 — Writing Test Lifecycle (Teacher Grading)

| # | Step | Method | Endpoint | Expected |
|---|------|--------|----------|----------|
| 1 | Teacher creates writing prompt | POST | `/api/writing` | 201, prompt saved |
| 2 | Student submits essay | POST | `/api/writing/submissions` | 201, status = `Pending` |
| 3 | Teacher views pending submissions | GET | `/api/writing/submissions` | 200, list includes student's submission |
| 4 | Teacher grades submission | PUT | `/api/writing/submissions/:id/grade` | 200, criteria scores + feedback saved |
| 5 | Student views graded result | GET | `/api/writing/submissions/:id` | 200, status = `Graded`, scores visible |

### 3.5 — Speaking Test Lifecycle (Teacher Grading)

| # | Step | Method | Endpoint | Expected |
|---|------|--------|----------|----------|
| 1 | Teacher creates speaking test | POST | `/api/speaking/tests` | 201 |
| 2 | Teacher assigns to student | PUT | `/api/speaking/assign` | 200 |
| 3 | Student views pending tests | GET | `/api/speaking/my-pending` | 200, assigned test listed |
| 4 | Student submits audio URL | PUT | `/api/speaking/:id/submit` | 200 |
| 5 | Teacher views pending grading | GET | `/api/speaking/pending` | 200 |
| 6 | Teacher grades submission | PUT | `/api/speaking/:id/grade` | 200, FC/LR/GRA/PR scores |

### 3.6 — Billing & Payment Upgrade Flow

| # | Step | Method | Endpoint | Expected |
|---|------|--------|----------|----------|
| 1 | Student checks current plan | GET | `/api/billing/my-plan` | 200, plan = `FREE` |
| 2 | Student checks eligibility | GET | `/api/billing/check-eligibility` | 200, eligible = false (FREE) |
| 3 | Student creates payment (VietQR) | POST | `/api/payment/create` | 200, QR URL + orderId |
| 4 | Student checks pending transaction | GET | `/api/payment/transactions/my-pending` | 200, transaction shown |
| 5 | Admin approves transaction | PUT | `/api/payment/transactions/:id/approve` | 200, status = `Success` |
| 6 | Student re-checks plan | GET | `/api/billing/my-plan` | 200, plan upgraded to VIP |
| 7 | Student checks eligibility again | GET | `/api/billing/check-eligibility` | 200, eligible = true |

### 3.7 — Media Upload & Delete Flow

| # | Step | Method | Endpoint | Expected |
|---|------|--------|----------|----------|
| 1 | Upload image | POST | `/api/media/upload` (multipart) | 201, secure_url + public_id |
| 2 | Generate upload signature | GET | `/api/media/generate-signature` | 200, signature + timestamp |
| 3 | Delete uploaded media | DELETE | `/api/media/delete` | 200, result = `ok` |
| 4 | Upload unsupported format | POST | `/api/media/upload` (.exe) | 400, rejected |

### 3.8 — Admin User Management

| # | Step | Method | Endpoint | Expected |
|---|------|--------|----------|----------|
| 1 | Admin lists all users | GET | `/api/auth/api/users` | 200, array of users |
| 2 | Admin filters by role | GET | `/api/auth/api/users?role=Student` | 200, filtered list |
| 3 | Admin blocks a student | PUT | `/api/auth/api/users/:id/status` | 200, `isActive = false` |
| 4 | Blocked student tries to login | POST | `/api/auth/login` | 403 or token but blocked |
| 5 | Admin unblocks student | PUT | `/api/auth/api/users/:id/status` | 200, `isActive = true` |
| 6 | Admin promotes to Teacher | PUT | `/api/auth/update-role/:id` | 200, role changed |

### 3.9 — Full Student Journey (E2E Happy Path)

| # | Step | Service |
|---|------|---------|
| 1 | Register account | auth |
| 2 | Login | auth |
| 3 | Take a reading test | reading |
| 4 | Take a listening test | listening |
| 5 | Submit writing essay | writing |
| 6 | Teacher grades essay | writing |
| 7 | Check billing (FREE tier, 3 tests used) | billing |
| 8 | Create VietQR payment for PLUS | payment |
| 9 | Admin approves payment | payment |
| 10 | Verify plan upgraded | billing |
| 11 | Continue taking tests (eligibility OK) | billing + reading |
| 12 | Upload profile image | cloud-media |

---

## 4. Negative / Edge-Case Scenarios

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Expired JWT token on any endpoint | 401 Unauthorized |
| 2 | Student accesses teacher-only routes | 403 Forbidden |
| 3 | Submit answers to non-existent test ID | 404 Not Found |
| 4 | Approve already-approved transaction | 400 Bad Request |
| 5 | Upload file exceeding 10MB limit | 413 Payload Too Large |
| 6 | Register with missing required fields | 400 Validation Error |
| 7 | Grade submission with scores out of 0-9 range | 400 |
| 8 | Access /profile without Authorization header | 401 |

---

## 5. Performance Smoke Tests

| Metric | Target | Method |
|--------|--------|--------|
| Login latency (p95) | < 500ms | Artillery / k6 |
| Reading test list (p95) | < 300ms | Artillery / k6 |
| File upload (5MB image) | < 3s | Artillery / k6 |
| Concurrent users | 50 simultaneous | k6 ramping VUs |

---

## 6. Execution Strategy

1. **Pre-deployment**: Run all unit + integration tests in CI (per-service).
2. **Post-deployment to staging**: Execute system test scenarios 3.1–3.9 sequentially.
3. **Regression gate**: All system tests must pass before production deploy.
4. **Tools**: Newman (Postman CLI) or custom shell scripts using `curl`/`httpie`.

---

## 7. Defect Severity Classification

| Severity | Criteria | Example |
|----------|----------|---------|
| **P0 — Blocker** | Core flow broken, no workaround | Cannot register/login |
| **P1 — Critical** | Major feature broken | Payment approval doesn't upgrade plan |
| **P2 — Major** | Feature partially broken | Grading saves but returns wrong score |
| **P3 — Minor** | Cosmetic / non-blocking | Error message text typo |
