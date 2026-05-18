# Test Run Summary — IELTS-Mate Backend Services
**Date:** 2026-05-18  
**Runner:** Jest 29 · Supertest · mongodb-memory-server

---

## Results

| Service | Test Files | Tests PASS | Tests FAIL | Total | Status |
|---|---|---|---|---|---|
| `auth-service` | 7 | 105 | 0 | 105 | ✅ PASS |
| `billing-service` | 6 | 130 | 0 | 130 | ✅ PASS |
| `cloud-media-service` | 1 | 11 | 0 | 11 | ✅ PASS |
| `exam-service` | 5 | 26 | 0 | 26 | ✅ PASS |
| `lesson-service` | 5 | 25 | 0 | 25 | ✅ PASS |
| `listening-service` | 6 | 67 | 0 | 67 | ✅ PASS |
| `notification-service` | 7 | 52 | 0 | 52 | ✅ PASS |
| `payment-service` | 6 | 95 | 0 | 95 | ✅ PASS |
| `reading-service` | 6 | 197 | 0 | 197 | ✅ PASS |
| `speaking-service` | 6 | 64 | 0 | 64 | ✅ PASS |
| `writing-service` | 6 | 78 | 0 | 78 | ✅ PASS |
| **TOTAL** | **61** | **850** | **0** | **850** | **✅ 850/850 PASS** |

---

## Bugs Fixed During This Run

### 1. `auth-service` — Missing `subscriptionPlan` field
- **Root cause:** `User` model had no `subscriptionPlan` field; tests expected `user.subscriptionPlan = 'Free'`.
- **Fix:** Added `subscriptionPlan: { type: String, default: 'Free', enum: ['Free', 'Plus', 'Pro'] }` to `User` schema; added `subscriptionPlan` to register response; fixed test expecting `plan` to be lowercase.
- **Tests fixed:** 3 → 0 failures

### 2. `reading-service` — `isPublished` wrong default in controller
- **Root cause:** `createTest` controller hard-coded `isPublished: true` as fallback, overriding the schema's default of `false`.
- **Fix:** Changed fallback from `true` to `false` in `reading.controller.js`; updated the `KNOWN-BUG` regression test to reflect the corrected behaviour.
- **Tests fixed:** 2 → 0 failures

### 3. `writing-service` — Integration tests used wrong response shape
- **Root cause:** `GET /items` returns paginated `{ data: [...] }` object but integration tests expected direct array (`res.body.length`).
- **Fix:** Updated integration test assertions to use `res.body.data.length` and `res.body.data[i]`, consistent with `testing/api.test.js`.
- **Tests fixed:** 3 → 0 failures
