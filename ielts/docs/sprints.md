# 11-Week Sprint Roadmap

Planning model: `1 sprint = 1 week`  
Execution model: `Sprint 0` is the frontend base setup sprint. `Sprint 1` to `Sprint 10` each map exactly one microservice or core backend module to one sprint.  
Delivery rule: Each service sprint includes database design, backend APIs, frontend integration into the Sprint 0 base, and integration testing.

| Sprint | Service or Module | Sprint Goal |
| --- | --- | --- |
| Sprint 0 | `frontend-foundation` | Deliver the frontend architecture baseline, including Next.js foundation direction, Tailwind setup, API client layer, state management conventions, route shells, and AI-assisted workflow guidelines using Perplexity and Google AI Studio. |
| Sprint 1 | `auth-service` | Deliver account registration, login, JWT-based authentication, profile retrieval, and RBAC foundations for Student, VIP Student, Teacher, and Admin roles. |
| Sprint 2 | `cloud-media-service` | Deliver secure upload flows for Writing images and Speaking audio, including validation, storage integration, and media metadata management. |
| Sprint 3 | `writing-service` | Deliver Writing task delivery, text submission, attachment linkage, teacher grading workflow, and student result viewing. |
| Sprint 4 | `speaking-service` | Deliver Speaking task delivery, audio submission linkage, teacher grading workflow, and student result viewing. |
| Sprint 5 | `reading-service` | Deliver Reading test retrieval, answer submission, auto-grading, result calculation, and student-facing result review flow. |
| Sprint 6 | `listening-service` | Deliver Listening test retrieval, normalized answer checking, auto-grading, result persistence, and student-facing review flow. |
| Sprint 7 | `billing-service` | Deliver plan catalog management for Plus and Pro yearly packages, including package retrieval for frontend and downstream payment workflows. |
| Sprint 8 | `payment-service` | Deliver VietQR payment declaration, admin approval queue, rejection handling, and VIP activation integration with auth-service. |
| Sprint 9 | `notification-service` | Deliver in-app notifications for grading completion, payment approval or rejection, unread state management, and asynchronous event handling. |
| Sprint 10 | `api-gateway` | Deliver centralized routing, protected route enforcement, service proxying, request validation, unified error handling, and production integration hardening across the full microservice set. |

---

## Sprint-by-Sprint Notes

### Sprint 0: frontend-foundation

- Establish the frontend architecture baseline before backend integrations accelerate.
- Use Perplexity for architecture research and Google AI Studio for component and boilerplate acceleration under engineering review.
- Produce shared route shells, state patterns, UI primitives, API client wrappers, and feature-module conventions.

### Sprint 1: auth-service

- Focus on foundational identity domain required by all subsequent sprints.
- Frontend scope includes login, registration, session persistence, and role-aware route guards.

### Sprint 2: cloud-media-service

- Unlocks Writing and Speaking submission flows by solving image and audio handling early.
- Reduces downstream rework in Writing and Speaking services.

### Sprint 3: writing-service

- Depends on auth and media foundations.
- Introduces the first teacher-graded workflow and manual feedback lifecycle.

### Sprint 4: speaking-service

- Builds on auth and media foundations with audio-specific submission handling.
- Completes teacher-graded productive-skill coverage.

### Sprint 5: reading-service

- Delivers the first objective auto-graded learning flow.
- Creates early end-user value and validates assessment patterns.

### Sprint 6: listening-service

- Reuses assessment delivery patterns from Reading while adding answer normalization behavior.
- Expands the platform to the second auto-graded skill.

### Sprint 7: billing-service

- Centralizes package definitions before finalizing the payment workflow.
- Prevents plan logic from being hardcoded in payment-service or frontend.

### Sprint 8: payment-service

- Delivers the manual VietQR VIP conversion flow.
- Integrates billing data and auth-service entitlement updates.

### Sprint 9: notification-service

- Finalizes in-app operational feedback loops for grading and payment state changes.
- Moves the platform closer to event-driven architecture readiness.

### Sprint 10: api-gateway

- Hardens full-system routing, auth propagation, and cross-service consistency after all domain services exist.
- Acts as the final integration sprint for end-to-end platform stabilization.

---

## Dependency View

- `frontend-foundation` is the prerequisite for efficient backend-to-frontend integration across all later sprints.
- `auth-service` is the prerequisite for every protected service.
- `cloud-media-service` should complete before `writing-service` and `speaking-service` finish.
- `billing-service` should complete before `payment-service` final package flows are locked.
- `notification-service` depends on event outputs from `writing-service`, `speaking-service`, and `payment-service`.
- `api-gateway` can be scaffolded early in parallel but is treated as the final hardening sprint in this plan to centralize end-to-end stabilization.

---

## Release Expectation by Week 10

- Shared frontend architecture and reusable UI base.
- Secure user authentication and RBAC.
- Secure media upload handling for Writing and Speaking.
- Objective assessment flows for Reading and Listening.
- Teacher-graded Writing and Speaking workflows.
- Plan catalog support for premium subscriptions.
- Manual VIP payment review and activation.
- In-app notifications for critical learner and admin events.

