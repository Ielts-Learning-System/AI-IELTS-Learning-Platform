# Sprint 8: payment-service

Sprint goal: Deliver VietQR payment declaration, admin approval queue, rejection handling, and VIP activation integration with auth-service using billing-service plan data.

---

## User Stories in Scope

| Story ID | User Story | Story Points |
| --- | --- | --- |
| E5-US01 | As a Student, I want to view available Plus and Pro yearly plans so that I can choose the VIP package that fits my needs. | 3 |
| E5-US02 | As a Student, I want to see VietQR payment instructions for my selected package so that I can transfer the correct amount. | 3 |
| E5-US03 | As a Student, I want to click "I have paid" after making a transfer so that my payment enters the admin review queue. | 5 |
| E5-US04 | As an Admin, I want to review pending payment declarations so that I can approve or reject them manually. | 5 |
| E5-US05 | As an Admin, I want VIP access to be activated only after approval so that premium access remains controlled and auditable. | 5 |
| E5-US06 | As a Student, I want to see the current payment request status so that I know whether my VIP access is pending, approved, or rejected. | 3 |

---

## Technical Breakdown

### E5-US01: View available plans

- [ ] Integrate billing-service plan retrieval into payment-service flow or gateway path strategy.
- [ ] Implement `GET /api/payments/plans` if payment-service exposes plan data downstream for the frontend.
- [ ] Normalize selected plan payloads so the frontend sees one stable contract.
- [ ] Build frontend subscription selection page using billing-service data and shared Sprint 0 components.

### E5-US02: Display VietQR payment instructions

- [ ] Define configuration for VietQR merchant details, account name, bank metadata, and static or generated QR references.
- [ ] Implement `GET /api/payments/instructions/:planCode` to return transfer instructions for a selected plan.
- [ ] Build frontend payment instruction screen showing QR code, transfer amount, and payment steps.

### E5-US03: Student declares payment

- [ ] Define `PaymentRequest` schema with `studentId`, `planCode`, `amount`, `status`, `declaredAt`, `reviewedAt`, `reviewedBy`, `rejectionReason`, and audit fields.
- [ ] Implement `POST /api/payments/declare` to create a pending payment request.
- [ ] Prevent duplicate active pending requests for the same student and plan according to policy.
- [ ] Build frontend "I have paid" confirmation flow and pending status page.

### E5-US04: Admin reviews pending declarations

- [ ] Implement `GET /api/payments/pending` for Admin review queue.
- [ ] Implement `GET /api/payments/:id` for request detail.
- [ ] Implement `POST /api/payments/:id/approve` and `POST /api/payments/:id/reject` for manual review actions.
- [ ] Build admin payment queue and detail view in the frontend base.

### E5-US05: Activate VIP only after approval

- [ ] Define integration contract with auth-service for VIP entitlement activation.
- [ ] On approval, call auth-service subscription update endpoint with correct plan and duration details.
- [ ] Persist approval result and activation audit trail in payment-service.
- [ ] Ensure no automatic activation occurs before admin approval.
- [ ] Publish approval or rejection event payloads for Sprint 9 notification-service integration.

### E5-US06: Student views payment status

- [ ] Implement `GET /api/payments/my-requests` for student history and current status.
- [ ] Build frontend status page or status section in profile or subscription area.
- [ ] Display `pending`, `approved`, and `rejected` states with timestamps and actionable next steps.

---

## Shared Technical Tasks

### Database and Backend

- [ ] Finalize indexes for student payment history, pending review queue, and status filters.
- [ ] Add auth and Admin role middleware for review actions.
- [ ] Add idempotency or duplicate-safe protection for declaration and approval flows.

### REST API Surface

- [ ] Finalize contracts for plan retrieval, instruction retrieval, declaration, pending queue, detail, approval, rejection, and student history routes.
- [ ] Document auth-service integration assumptions for VIP activation.

### FE Integration into Sprint 0 Base

- [ ] Create Payment API client methods and DTOs.
- [ ] Build subscription selection, QR instruction, pending status, and admin review screens using shared frontend components.
- [ ] Add role-aware navigation for student payment pages and admin review pages.

### Integration and Testing

- [ ] Test payment declaration happy path and duplicate prevention.
- [ ] Test admin approval and rejection flows.
- [ ] Test auth-service VIP activation call behavior.
- [ ] Record notification event payloads for Sprint 9.

---

## Definition of Done for Sprint 8

- Students can select plans, view VietQR instructions, and declare payment.
- Admins can approve or reject pending payment requests.
- VIP activation happens only after successful approval.
- Student payment statuses are visible in the frontend.
