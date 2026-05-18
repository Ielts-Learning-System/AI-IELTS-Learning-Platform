# Billing Service — Product Requirements Document

## Overview

The Billing Service manages subscription plans, user subscriptions, and skill access control for the IELTS platform. It provides plan lifecycle management, subscription activation via internal API, and enforces skill-gating based on a user's active plan.

---

## Epics

### Epic 1: Plan Management

**Goal**: Administrators can create and manage subscription plans with configurable skill bundles.

#### User Stories

**US-1.1 — View active plans (public)**
- As a visitor or student, I want to view all available subscription plans so I can choose one to purchase.
- Acceptance: `GET /plans` returns only active plans sorted by price ascending with no authentication required.

**US-1.2 — Admin creates plan**
- As an admin, I want to create subscription plans with configurable skills, duration, and pricing.
- Acceptance: `POST /admin/plans` with valid payload creates a plan and returns HTTP 201. Missing required fields return HTTP 400.

**US-1.3 — Admin updates plan**
- As an admin, I want to update plan details without recreating it.
- Acceptance: `PUT /admin/plans/:planId` updates name, price, features, benefits.skills, etc. Non-existent plan returns 404.

**US-1.4 — Toggle plan visibility**
- As an admin, I want to deactivate a plan without deleting it so it stops appearing in public listings.
- Acceptance: `PATCH /admin/plans/:planId/toggle-active` flips isActive. Inactive plans disappear from `GET /plans`.

**US-1.5 — Delete plan**
- As an admin, I want to permanently delete obsolete plans.
- Acceptance: `DELETE /admin/plans/:planId` returns 200 on success, 404 if not found.

---

### Epic 2: Subscription Lifecycle

**Goal**: Track which users have active subscriptions, activate via internal API after payment, and allow admins to cancel or restore subscriptions.

#### User Stories

**US-2.1 — View my subscription**
- As a logged-in student, I want to see my current subscription status.
- Acceptance: `GET /my-subscription` returns HTTP 200 with `data: null` + `planFallback: { code: 'FREE' }` when no record exists; returns full subscription with populate planId when active.

**US-2.2 — Auto-expire past subscriptions**
- As a student, when my subscription's validUntil has passed, the system should automatically mark it EXPIRED.
- Acceptance: `GET /my-subscription` updates status to EXPIRED in-place if validUntil < now.

**US-2.3 — Internal subscription activation (no auth)**
- As the payment service, I want to activate a subscription after successful payment confirmation.
- Acceptance: `POST /internal/subscriptions/activate` with `{ userId, planCode, validUntil }` upserts the record. No auth token required. Unknown planCode returns 404.

**US-2.4 — Admin cancel subscription**
- As an admin, I want to cancel an active subscription for policy violations or refunds.
- Acceptance: `POST /admin/subscriptions/:id/cancel` with `{ reason, editedTitle, editedMessage }` sets status to CANCELLED, stores reason (must be one of: POLICY_VIOLATION, SYSTEM_ERROR, USER_REQUEST_REFUND). Cancelling non-ACTIVE subscription returns 400.

**US-2.5 — Admin restore subscription**
- As an admin, I want to restore a wrongly cancelled subscription.
- Acceptance: `POST /admin/subscriptions/:id/restore` sets status to ACTIVE. Cannot restore if status is not CANCELLED or if validUntil is in the past.

**US-2.6 — Send expiry reminder**
- As an admin, I want to send a reminder notification before a subscription expires.
- Acceptance: `POST /admin/remind/:userId` publishes `billing.subscription.reminder` event via RabbitMQ. Returns 404 if user has no subscription.

---

### Epic 3: Skill Access Control

**Goal**: Gate access to IELTS skill features based on the user's subscription plan.

#### User Stories

**US-3.1 — Skill check endpoint**
- As a microservice, I want to verify whether a user can access a specific skill.
- Acceptance: `GET /skill-check/:skillName` returns HTTP 200 with `{ allowed: true, skill, plan }` for authorized users; HTTP 403 with `{ code: 'SKILL_NOT_ALLOWED' }` for unauthorized.

**US-3.2 — PRO bypass**
- As a PRO subscriber, I should have access to all skills without plan lookup.
- Acceptance: `requireSkill` middleware calls `next()` immediately for PRO plan code.

**US-3.3 — FREE plan denial**
- As a FREE user, I should be denied access to all skills.
- Acceptance: `requireSkill` returns HTTP 403 `SKILL_NOT_ALLOWED` with `allowedSkills: []`.

**US-3.4 — Plan DB lookup for unknown plans**
- As a PLUS subscriber, I should only access skills in my plan's `benefits.skills` array.
- Acceptance: `requireSkill` queries the Plan collection. If plan code not found, returns 403 `PLAN_NOT_FOUND`.

**US-3.5 — Check my skills**
- As a student, I want to know which skills my plan includes.
- Acceptance: `GET /my-skills` returns `{ allowedSkills, isPro, plan, planName }`.

---

### Epic 4: Reporting & Statistics

**Goal**: Admins can view subscription statistics and user subscription data.

#### User Stories

**US-4.1 — Billing statistics**
- As an admin, I want a dashboard summary of subscription data.
- Acceptance: `GET /admin/stats` returns `{ totalSubscriptions, activeSubscriptions, totalRevenue, planBreakdown }`.

**US-4.2 — All subscriptions list**
- As an admin, I want to see all user subscriptions with user identity data.
- Acceptance: `GET /admin/subscriptions` returns enriched array including `daysRemaining`, user name/email from auth-service, plan name.

---

## Non-Functional Requirements

| NFR | Requirement |
|-----|-------------|
| Security | All admin endpoints require `admin` role JWT |
| Internal API | `/internal/*` endpoints require no auth (called service-to-service) |
| Idempotency | `activateSubscriptionInternal` uses upsert — safe to call twice |
| Resilience | User data fetch from auth-service has fallback to `Unknown` on failure |
| Scalability | Mongoose `userId` index ensures O(1) subscription lookups |
