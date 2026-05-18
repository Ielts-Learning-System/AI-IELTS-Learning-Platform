# auth-service — Product Requirements Document

## 1. Service Overview

| Property | Value |
|---|---|
| Service | `auth-service` |
| Port | 3001 |
| Database | `ielts_auth_db` |
| Sprint | Sprint 1 |

The auth-service is the **identity backbone** of the IELTS-Mate platform. It handles user registration, authentication via JWT, profile management, and role-based access control (RBAC).

---

## 2. Epics & User Stories

### Epic 1 — User Registration & Authentication

**US-1.1** As a new visitor, I want to register with email and password so I can access the platform.
- AC1: POST `/register` with valid email + password returns 201 + JWT token
- AC2: Duplicate email returns 400 with `"User already exists"`
- AC3: Missing email or password returns 400
- AC4: Role is always set to `Student` regardless of request body
- AC5: `publishEvent('auth.user.registered', ...)` is called after successful save

**US-1.2** As a registered user, I want to log in to receive a fresh JWT.
- AC1: POST `/login` with correct credentials returns 200 + token
- AC2: Wrong password returns 401 with generic message (no info leakage)
- AC3: Non-existent email returns 401
- AC4: Missing fields return 400

### Epic 2 — Profile Management

**US-2.1** As an authenticated user, I want to view my profile.
- AC1: GET `/profile` with valid Bearer token returns 200 with user data
- AC2: Password field must NOT be included in response
- AC3: No token → 401; Invalid token → 401

**US-2.2** As an authenticated user, I want to update my profile name and avatar.
- AC1: PUT `/profile` with `name` field updates the user document
- AC2: Returns updated user object

**US-2.3** As an authenticated user, I want to change my password.
- AC1: PUT `/change-password` with correct `currentPassword` + `newPassword` succeeds
- AC2: Wrong `currentPassword` returns 400
- AC3: `newPassword` shorter than 6 chars returns 400

### Epic 3 — Role-Based Access Control

**US-3.1** As an Admin, I want to change another user's role.
- AC1: PUT `/update-role/:id` with `Admin` token succeeds
- AC2: Non-Admin token returns 403

### Epic 4 — Internal Service Endpoints

**US-4.1** As another microservice, I want to batch-fetch user profiles by ID list.
- AC1: POST `/internal/users/batch` returns array of user objects matching given IDs
- AC2: No JWT required (network-internal only)

**US-4.2** As the billing-service, I want to update a user's subscription plan.
- AC1: PATCH `/internal/users/:id/subscription` updates `plan` and `vipValidUntil`

---

## 3. Roles & Permissions Matrix

| Role | Register | Login | View Profile | Change Password | Update Role | Internal API |
|---|---|---|---|---|---|---|
| Guest | ✅ | ✅ | ❌ | ❌ | ❌ | N/A |
| Student | — | ✅ | ✅ | ✅ | ❌ | N/A |
| Teacher | — | ✅ | ✅ | ✅ | ❌ | N/A |
| Admin | — | ✅ | ✅ | ✅ | ✅ | N/A |

---

## 4. Non-Functional Requirements

- All passwords stored bcrypt-hashed (salt rounds = 10)
- JWT expires in 7 days; payload contains `{ id, role, plan }`
- Email stored lowercase (Mongoose `lowercase: true`)
- Event published to RabbitMQ after registration for downstream notification workflows
