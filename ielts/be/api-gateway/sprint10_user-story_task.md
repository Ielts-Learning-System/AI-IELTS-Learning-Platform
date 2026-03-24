# Sprint 10: api-gateway

Sprint goal: Deliver centralized routing, protected route enforcement, service proxying, unified error handling, and production integration hardening across the full microservice set.

---

## User Stories in Scope

| Story ID | User Story | Story Points |
| --- | --- | --- |
| E9-US01 | As an Admin, I want operational dashboards for payment and grading queues so that I can detect bottlenecks quickly. | 5 |
| E9-US02 | As an Engineer, I want service health checks and structured logs so that failures can be diagnosed quickly. | 3 |
| E9-US03 | As an Admin, I want auditable records for approvals, role changes, and subscription activation so that sensitive actions can be traced. | 5 |
| E1-US04 | As an Admin, I want the system to enforce role-based access control so that Guest, Student, VIP Student, Teacher, and Admin users only access authorized features. | 5 |

---

## Technical Breakdown

### E9-US01: Centralized operational routing for admin workflows

- [ ] Finalize gateway route map for auth, media, writing, speaking, reading, listening, billing, payment, and notification services.
- [ ] Ensure admin-facing frontend flows can call a single gateway base URL for payment queue, grading queues, and notification views.
- [ ] Normalize pagination, filtering, and error response behavior where gateway-level transformation is required.

### E9-US02: Health checks and structured logs

- [ ] Implement `GET /health` or aggregated gateway health endpoint for downstream service reachability.
- [ ] Add structured request logging with correlation IDs across proxied requests.
- [ ] Capture upstream status codes and downstream error envelopes for diagnostics.
- [ ] Add timeout and retry policies appropriate for each downstream service type.

### E9-US03: Auditable and stable cross-service request flow

- [ ] Forward authenticated identity context safely to downstream services.
- [ ] Standardize headers for `x-request-id`, actor identity, and role propagation where needed.
- [ ] Ensure admin mutation routes preserve audit-relevant request context.
- [ ] Document gateway-level security and logging decisions for operations.

### E1-US04: Enforce RBAC at the edge

- [ ] Integrate JWT verification or auth-service validation flow into the gateway.
- [ ] Protect role-restricted upstream routes before proxying when edge authorization is part of the chosen design.
- [ ] Ensure VIP-only frontend routes map to gateway-protected API access patterns.
- [ ] Validate that proxy path rewriting preserves the correct downstream route paths.

---

## Shared Technical Tasks

### Backend and Proxy Architecture

- [ ] Finalize environment config for all downstream service base URLs.
- [ ] Implement proxy middleware per service with clear route namespaces.
- [ ] Add centralized CORS, body-size, and multipart limits aligned with media flows.
- [ ] Add graceful degradation behavior for downstream failures where possible.

### REST API Surface and Contracts

- [ ] Validate all frontend-consumed endpoint paths against the final gateway map.
- [ ] Document any gateway-level request or response normalization.
- [ ] Verify that upload routes, auth routes, and internal admin routes behave consistently through the proxy layer.

### FE Integration into Sprint 0 Base

- [ ] Update the shared frontend API client to use the final gateway route map only.
- [ ] Remove any direct service URL assumptions from the frontend codebase.
- [ ] Verify all service screens built in previous sprints work unchanged against gateway URLs.

### Integration and Testing

- [ ] Test end-to-end routing for every service through the gateway.
- [ ] Test unauthorized and forbidden scenarios at the gateway layer.
- [ ] Test error handling consistency for downstream outages and validation failures.
- [ ] Test request tracing and health endpoint outputs.

---

## Definition of Done for Sprint 10

- All frontend traffic uses the API Gateway as the single backend entry point.
- Gateway auth propagation and RBAC behavior are stable.
- Downstream failures are observable and mapped consistently.
- End-to-end platform integration is production-hardened for the planned MVP scope.
