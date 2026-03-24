# Sprint 1: auth-service

Sprint goal: Deliver account registration, login, JWT authentication, profile retrieval, and role-based access foundations that plug into the Sprint 0 frontend base.

---

## User Stories in Scope

| Story ID | User Story | Story Points |
| --- | --- | --- |
| E1-US01 | As a Guest, I want to register an account so that I can access IELTS practice features. | 5 |
| E1-US02 | As a Student, I want to log in securely so that I can access my learning history and protected features. | 3 |
| E1-US03 | As an authenticated user, I want my session and profile to be loaded after login so that the UI can show the correct permissions and navigation. | 3 |
| E1-US04 | As an Admin, I want the system to enforce role-based access control so that Guest, Student, VIP Student, Teacher, and Admin users only access authorized features. | 5 |
| E1-US05 | As a VIP Student, I want my VIP entitlement status to be reflected in my profile so that I can access premium features only when my subscription is active. | 3 |
| E1-US06 | As an Admin, I want to activate or update user roles and account states so that operational access changes are controlled centrally. | 5 |

---

## Technical Breakdown

### E1-US01: Register account

- [ ] Define the `User` database schema with `fullName`, `email`, `passwordHash`, `role`, `vipStatus`, `vipPlan`, `vipStartDate`, `vipEndDate`, `isActive`, `createdAt`, and `updatedAt`.
- [ ] Create unique indexes for `email` and other login identifiers if required.
- [ ] Define request DTO validation for registration payloads.
- [ ] Implement `POST /api/auth/register` to create a default Student account.
- [ ] Hash passwords using `bcryptjs` before persistence.
- [ ] Return sanitized user data without password hashes.
- [ ] Integrate registration into the Sprint 0 frontend base using the shared API client.
- [ ] Connect the register screen to shared form validation, loading states, and error handling patterns defined in Sprint 0.
- [ ] Add integration tests for successful registration, duplicate account rejection, and invalid payload handling.

### E1-US02: Secure login

- [ ] Implement `POST /api/auth/login` for email and password authentication.
- [ ] Validate password hashes using `bcryptjs`.
- [ ] Generate JWT tokens containing user ID, role, and entitlement claims required by downstream services.
- [ ] Configure JWT secret and token lifetime through environment variables.
- [ ] Define login response contract with token and user summary.
- [ ] Integrate the login screen into the Sprint 0 auth store or equivalent state management layer.
- [ ] Persist authenticated session state according to the approved frontend auth strategy.
- [ ] Add frontend handling for invalid credentials, disabled accounts, and unexpected errors.
- [ ] Add tests for valid login, invalid password, missing account, and inactive account scenarios.

### E1-US03: Load authenticated session and profile

- [ ] Implement `GET /api/auth/me` to return the authenticated user profile.
- [ ] Build auth middleware to verify JWT tokens for protected routes.
- [ ] Standardize the profile response contract with `role`, `vipStatus`, `vipPlan`, and account state fields.
- [ ] Connect auth bootstrap logic so the Sprint 0 frontend base can restore session state on refresh.
- [ ] Wire protected layouts and role-aware navigation to authenticated profile data.
- [ ] Implement logout behavior that clears session state and resets protected UI state.
- [ ] Add tests for valid token, invalid token, expired token, and profile retrieval behavior.

### E1-US04: Enforce role-based access control

- [ ] Define the role enum and access rules for Guest, Student, VIP Student, Teacher, and Admin.
- [ ] Implement authorization middleware for role-restricted endpoints.
- [ ] Provide a token validation or introspection route if the gateway and downstream services need one, such as `GET /api/auth/validate`.
- [ ] Apply RBAC to protected auth management endpoints.
- [ ] Integrate role-based route guards into the Sprint 0 frontend shells for student, teacher, admin, and VIP-specific views.
- [ ] Test forbidden access behavior across backend routes and frontend navigation.

### E1-US05: Reflect VIP entitlement in profile

- [ ] Extend the user model to store VIP entitlement state and plan metadata.
- [ ] Define clear entitlement states such as `inactive`, `pending`, and `active`.
- [ ] Expose VIP status safely through `GET /api/auth/me` for frontend consumption.
- [ ] Show entitlement state in the profile area and role-aware navigation.
- [ ] Confirm the contract supports future payment-service updates without frontend shape changes.
- [ ] Add tests for Student versus VIP Student profile states.

### E1-US06: Admin manages roles and account states

- [ ] Implement `PATCH /api/auth/users/:id/role` for admin role management.
- [ ] Implement `PATCH /api/auth/users/:id/subscription` for admin-driven VIP status updates.
- [ ] Implement `PATCH /api/auth/users/:id/status` for account activation or suspension if the team wants account-state control in Sprint 1.
- [ ] Ensure only Admin users can invoke these endpoints.
- [ ] Connect the frontend admin base from Sprint 0 to placeholder management screens or admin actions where required.
- [ ] Add audit-friendly response payloads for administrative state changes.
- [ ] Add integration tests for allowed and forbidden admin actions.

---

## Shared Technical Tasks

### Database and Backend Structure

- [ ] Finalize MongoDB connection configuration and environment handling.
- [ ] Organize `config`, `models`, `controllers`, `middlewares`, and `routes` for maintainable auth-service code.
- [ ] Add structured error handling, request logging, and a health check endpoint such as `GET /health`.

### REST API Surface

- [ ] Finalize Sprint 1 API contract for `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `GET /api/auth/validate`, `PATCH /api/auth/users/:id/role`, `PATCH /api/auth/users/:id/subscription`, and optional `PATCH /api/auth/users/:id/status`.
- [ ] Document request and response payloads for the frontend team.
- [ ] Verify gateway compatibility assumptions for headers, auth token forwarding, and error response format.

### FE Integration into Sprint 0 Base

- [ ] Create or update frontend auth API methods using the shared Sprint 0 API client.
- [ ] Wire Login, Register, Profile, and protected layout logic into the shared auth state layer.
- [ ] Ensure route guards respect authentication, role, and VIP entitlement states.
- [ ] Ensure all auth screens use shared Sprint 0 form components, error views, and loading states.

### Integration and Testing

- [ ] Test auth-service endpoints directly and through the gateway-compatible contract.
- [ ] Verify frontend login, register, session restore, logout, and role-based redirection flows.
- [ ] Verify protected page access for Student, Teacher, Admin, and VIP scenarios.
- [ ] Record open contract issues that may affect Sprint 2 media integration.

---

## Definition of Done for Sprint 1

- Registration and login flows work end-to-end against the shared frontend base.
- Authenticated session restore works on refresh.
- Backend and frontend role-based protection are both enforced.
- VIP entitlement fields are available in the authenticated profile contract.
- Admin role and subscription update actions are implemented or explicitly deferred with documented reason.
- Sprint 1 API contracts are stable enough for Sprint 2 integration planning.
