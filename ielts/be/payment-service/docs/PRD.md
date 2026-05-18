# Product Requirements Document (PRD) — Payment Service

## 1. Overview
Payment Service handles transaction creation and approval for plan upgrades in IELTS platform. It generates VietQR payment links, tracks transaction lifecycle, and coordinates with auth-service and billing-service after admin approval.

## 2. Goals
- Support secure VietQR payment creation for authenticated users.
- Provide transaction management endpoints for back-office operations.
- Ensure successful approvals upgrade user plan in auth-service.
- Keep billing-service subscription state synchronized (best effort).

## 3. Scope
### In scope
- Create pending transactions with VietQR URL.
- Retrieve current user latest pending transaction.
- Retrieve all transactions for management UI.
- Approve pending transactions and upgrade user plan.
- Reject pending transactions.

### Out of scope
- Real-time payment gateway callback processing.
- Refund and dispute workflow.
- Financial reconciliation reporting.

## 4. Actors
- Student/User: creates payment requests, checks latest pending transaction.
- Admin/Operator: views transactions, approves/rejects transactions.
- Internal systems: auth-service and billing-service for cross-service updates.

## 5. Functional Requirements
### FR-01: Create VietQR payment
- Endpoint: POST /create (alias: POST /create-vietqr)
- Requires valid Bearer token.
- Request requires planId and amount (> 0 finite number).
- Service creates a Pending transaction with generated orderId prefix VIP.
- Service returns qrUrl, orderId, amount.
- If VietQR env config is missing, return 500.

### FR-02: Get my latest pending transaction
- Endpoint: GET /transactions/my-pending
- Requires valid Bearer token.
- Returns latest transaction with status Pending for current user.
- Returns success with data:null when no pending transaction exists.

### FR-03: Get all transactions
- Endpoint: GET /transactions
- Requires valid Bearer token.
- Returns transactions sorted by createdAt desc.
- Enriches userId using auth-service batch user endpoint.
- If auth-service enrichment fails, still returns transactions (fallback).

### FR-04: Approve transaction
- Endpoint: PUT /transactions/:id/approve
- Requires valid Bearer token.
- Transaction must exist and be Pending.
- planId must be supported by PLAN_UPGRADE_CONFIG.
- Calls auth-service to set target plan and vipValidUntil.
- If auth-service update fails, return 502 and do not mark transaction Success.
- Calls billing-service sync endpoint (non-fatal if failed).
- Marks transaction status to Success when auth update succeeds.

### FR-05: Reject transaction
- Endpoint: PUT /transactions/:id/reject
- Requires valid Bearer token.
- Transaction must exist and be Pending.
- Marks status as Failed.

## 6. Non-Functional Requirements
- Availability: fallback behavior when user enrichment fails.
- Reliability: idempotent state transitions enforced by status checks.
- Security: JWT verification on all payment/transaction endpoints.
- Traceability: persistent transaction record with timestamps.

## 7. Business Rules
- Allowed status transitions:
  - Pending -> Success (approve)
  - Pending -> Failed (reject)
  - Success/Failed cannot be approved/rejected again
- PLAN_UPGRADE_CONFIG mapping:
  - PLUS -> PLUS, 30 days
  - VIP_1_MONTH -> PLUS, 30 days
  - VIP_6_MONTH -> PLUS, 180 days
  - PRO -> PRO, 365 days
  - VIP_1_YEAR -> PRO, 365 days
- orderId format starts with VIP and embeds timestamp suffix.

## 8. Dependencies
- MongoDB for transaction persistence.
- auth-service internal endpoint for plan upgrade.
- billing-service internal endpoint for subscription sync.
- Environment variables:
  - JWT_SECRET
  - VIETQR_BANK_ID
  - VIETQR_ACCOUNT_NO
  - VIETQR_ACCOUNT_NAME
  - AUTH_SERVICE_INTERNAL_URL (optional override)
  - BILLING_SERVICE_INTERNAL_URL (optional override)

## 9. Acceptance Criteria
- All endpoints respond according to contract and status codes.
- 95 automated tests pass for schema, unit, api, e2e, regression, integration.
- Unsupported planId approval returns 400.
- Auth-service failure during approve returns 502.
- Billing-service failure during approve does not block success.
