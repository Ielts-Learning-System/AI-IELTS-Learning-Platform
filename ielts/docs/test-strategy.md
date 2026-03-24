# IELTS Platform — Comprehensive Testing Strategy

> **Version:** 1.0  
> **Date:** 2025-01-XX  
> **Author:** QA Engineer / Backend Engineer  
> **Scope:** All backend microservices (excluding notification-service)

---

## 1. Testing Objectives

| Objective | Description |
|-----------|-------------|
| **Correctness** | Every endpoint returns the expected status code, body shape, and data |
| **Security** | Auth/RBAC rules are enforced; tokens validated; role escalation prevented |
| **Data Integrity** | Mongoose validations, unique constraints, and business rules are upheld |
| **Regression Safety** | Tests run in CI on every PR to catch regressions early |
| **Coverage Target** | ≥ 80 % line coverage per service (controllers + models + middlewares) |

---

## 2. Test Pyramid

```
        ┌──────────────────┐
        │  System / E2E    │  ← Manual + future Playwright/k6
        │   (5 – 10 %)     │
        ├──────────────────┤
        │  Integration     │  ← supertest + mongodb-memory-server
        │   (30 – 40 %)    │
        ├──────────────────┤
        │  Unit Tests      │  ← Jest + mocks
        │   (50 – 60 %)    │
        └──────────────────┘
```

---

## 3. Technology Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| Test Runner | **Jest 29** | Test execution, assertions, mocking |
| HTTP Layer | **supertest 7** | Integration tests against Express app |
| In-Memory DB | **mongodb-memory-server 10** | Isolated MongoDB per test suite |
| Coverage | **Jest --coverage** | Istanbul-based coverage reports |
| CI Runner | **GitHub Actions** | Automated test execution on push/PR |

---

## 4. Project Structure (per service)

```
<service>/
├── src/                       # Production code
├── tests/
│   ├── setup.js               # MongoMemoryServer lifecycle
│   ├── helpers.js             # Token generation helpers
│   ├── unit/
│   │   ├── models/            # Model validation tests
│   │   └── controllers/       # Controller logic tests (mocked DB)
│   └── integration/
│       └── routes/            # Full HTTP tests via supertest
├── jest.config.js
└── package.json               # Updated with test scripts & devDeps
```

---

## 5. Environment Isolation

- **Unit tests:** Mongoose models tested against MongoMemoryServer; external services (Cloudinary, Gemini, VietQR) are mocked via `jest.mock()`.
- **Integration tests:** Express app instance created without `app.listen()`; MongoDB via MongoMemoryServer; JWT tokens generated in-process with a test secret.
- **CI:** `mongo:7` service container in GitHub Actions provides MongoDB; `JWT_SECRET=test-secret` env var set at workflow level.

---

## 6. Naming Convention

| Type | Pattern | Example |
|------|---------|---------|
| Unit | `*.unit.test.js` | `auth.controller.unit.test.js` |
| Integration | `*.integration.test.js` | `auth.routes.integration.test.js` |

---

## 7. Mocking Strategy

| Dependency | Mock Approach |
|------------|---------------|
| Mongoose Models | `jest.spyOn(Model, 'findOne')` for unit tests; real DB for integration |
| `bcryptjs` | Real in integration tests; `jest.mock('bcryptjs')` in unit when needed |
| `jsonwebtoken` | Real with test-secret in integration; mock in unit |
| Cloudinary SDK | `jest.mock('../config/cloudinary')` + `jest.mock('../utils/cloudinary.util')` |
| Google Gemini AI | `jest.mock('@google/generative-ai')` |
| VietQR URL generation | Env vars set to test values; URL format validated |
| `req.user` | Injected via helper that generates valid JWT with chosen role |

---

## 8. Services & Test Scope

| Service | Port | Key Endpoints to Test | DB Models |
|---------|------|-----------------------|-----------|
| auth-service | 3001 | register, login, profile, update-role, users CRUD | User |
| reading-service | 3002 | CRUD tests, submit & auto-grade, attempts | ReadingTest, ReadingAttempt |
| listening-service | 3003 | CRUD tests, submit & auto-grade, attempts | ListeningTest, ListeningAttempt |
| writing-service | 3004 | CRUD prompts, submit, grade submissions | Writing, WritingSubmission |
| billing-service | 3005 | plans, subscriptions, eligibility check | Plan, Subscription |
| speaking-service | 3008 | CRUD tests, assign, submit audio, grade | SpeakingTest, SpeakingSubmission |
| payment-service | 3009 | create VietQR, transactions, approve/reject | Transaction, User |
| cloud-media-service | 3010 | upload, delete, generate-signature | — (Cloudinary) |

---

## 9. CI Integration

Each service's GitHub Actions workflow:

1. Checks out code
2. Sets up Node 20
3. Starts `mongo:7` service container (health-check)
4. Runs `npm ci`
5. Sets env: `MONGO_URI`, `JWT_SECRET`, service-specific env vars
6. Runs `npm test` → Jest with `--forceExit --detectOpenHandles --coverage`
7. Uploads coverage artifact (optional)

---

## 10. Acceptance Criteria for Tests

- [ ] Each service has ≥ 3–5 test cases per major endpoint
- [ ] Happy path + at least 2 error/edge cases per endpoint
- [ ] Auth middleware tested: no token, invalid token, wrong role
- [ ] Model validations tested: required fields, enums, unique constraints
- [ ] CI passes on a clean checkout with `npm ci && npm test`
- [ ] No test depends on external network calls (all mocked)

---

## 11. System / E2E Test Plan

See [`system-test-plan.md`](system-test-plan.md) for the full manual + automated E2E test plan covering cross-service flows.
