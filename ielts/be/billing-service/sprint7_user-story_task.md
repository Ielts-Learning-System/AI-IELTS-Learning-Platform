# Sprint 7: billing-service

Sprint goal: Deliver centralized plan catalog management for Plus and Pro yearly subscriptions so payment flows and frontend pricing views consume a single source of truth.

---

## User Stories in Scope

| Story ID | User Story | Story Points |
| --- | --- | --- |
| E8-US01 | As an Admin, I want to manage the Plus and Pro plan catalog so that package definitions remain configurable. | 3 |
| E8-US02 | As the payment workflow, I want package data to be sourced from a billing domain so that pricing logic is centralized. | 3 |

---

## Technical Breakdown

### E8-US01: Manage plan catalog

- [ ] Define `BillingPlan` schema with `code`, `name`, `description`, `durationMonths`, `price`, `currency`, `features`, `isActive`, `displayOrder`, `createdAt`, and `updatedAt`.
- [ ] Seed default plans for `Plus` and `Pro` with 1-year duration.
- [ ] Implement `GET /api/billing/plans` for frontend and payment-service consumption.
- [ ] Implement `GET /api/billing/plans/:code` for plan detail retrieval.
- [ ] Implement admin-protected `POST /api/billing/plans` and `PATCH /api/billing/plans/:id` for catalog management if in scope.
- [ ] Build frontend plan-listing section for subscription screens using Sprint 0 shared card components.

### E8-US02: Centralized plan source for payment flow

- [ ] Define stable response contracts that payment-service can use without duplicating plan logic.
- [ ] Add internal validation helpers so payment-service can verify selected plan codes against active catalog entries.
- [ ] Ensure inactive plans cannot be selected for new payment requests.
- [ ] Document billing-service dependency contract for Sprint 8 payment integration.

---

## Shared Technical Tasks

### Database and Backend

- [ ] Finalize indexes for `code`, `isActive`, and `displayOrder`.
- [ ] Add auth and admin-role middleware for catalog mutation endpoints.
- [ ] Add validation for price, duration, and plan feature structures.

### REST API Surface

- [ ] Finalize contracts for plan list, plan detail, and admin catalog mutation routes.
- [ ] Align response shape with payment and frontend subscription UI needs.

### FE Integration into Sprint 0 Base

- [ ] Create Billing API client methods and DTOs.
- [ ] Build subscription plan cards and selection state in the frontend base.
- [ ] Add admin plan management placeholder screens if catalog editing is in sprint scope.

### Integration and Testing

- [ ] Test plan retrieval and active-only filtering.
- [ ] Test admin create or update behavior if mutation endpoints are implemented.
- [ ] Validate compatibility with Sprint 8 payment-service inputs.

---

## Definition of Done for Sprint 7

- Plan catalog is centralized in billing-service.
- Frontend subscription views consume billing-service data.
- Payment-service can validate plan codes against active billing plans.
