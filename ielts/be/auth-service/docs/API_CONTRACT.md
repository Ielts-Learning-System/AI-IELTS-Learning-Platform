# auth-service — API Contract

Base URL (via API Gateway): `http://localhost:3000/api/auth`

All protected routes require: `Authorization: Bearer <token>`

---

## Public Endpoints

### POST `/register`
Register a new student account.

**Request Body**
```json
{
  "email": "alice@example.com",
  "password": "Secret123!",
  "name": "Alice Nguyen"
}
```

**Response 201**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "_id": "664abc...",
    "email": "alice@example.com",
    "name": "Alice Nguyen",
    "role": "Student",
    "plan": "FREE",
    "vipValidUntil": null,
    "avatar": "https://ui-avatars.com/api/?name=Alice%20Nguyen&background=random",
    "token": "eyJhb..."
  }
}
```

**Response 400** — duplicate email or missing fields

---

### POST `/login`
Authenticate and receive a JWT.

**Request Body**
```json
{
  "email": "alice@example.com",
  "password": "Secret123!"
}
```

**Response 200** — same shape as register `data` object

**Response 401** — wrong credentials

---

## Protected Endpoints (require JWT)

### GET `/profile`
Get the authenticated user's profile.

**Response 200**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "_id": "664abc...",
    "email": "alice@example.com",
    "name": "Alice Nguyen",
    "role": "Student",
    "plan": "FREE",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### PUT `/profile`
Update name or avatar.

**Request Body**
```json
{
  "name": "Alice Updated",
  "avatar": "https://example.com/avatar.png"
}
```

**Response 200** — updated user object

---

### PUT `/change-password`
Change password for the authenticated user.

**Request Body**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass456!"
}
```

**Response 200** `{ "success": true, "message": "Password changed successfully" }`

**Response 400** — wrong current password or new password too short

---

### PUT `/update-role/:id` _(Admin only)_
Change a user's role.

**Request Body**
```json
{ "role": "Teacher" }
```

**Response 200** — updated user object  
**Response 403** — non-Admin token

---

## Internal Endpoints (no JWT, network-internal only)

### POST `/internal/users/batch`
Batch-fetch users by an array of IDs.

**Request Body** `{ "ids": ["664abc...", "664def..."] }`

**Response 200** `{ "success": true, "data": [ ...users ] }`

---

### PATCH `/internal/users/:id/subscription`
Update a user's plan and vipValidUntil (called by billing-service after payment).

**Request Body**
```json
{
  "plan": "PRO",
  "vipValidUntil": "2026-01-01T00:00:00.000Z"
}
```

**Response 200** `{ "success": true, "data": { ...updatedUser } }`

---

## Health Check

### GET `/health`
**Response 200** `{ "status": "Auth Service is ALIVE!" }`
