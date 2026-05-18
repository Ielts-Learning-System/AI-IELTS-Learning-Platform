# Billing Service — API Contract

Base path: `/` (mounted via API Gateway at `/api/billing`)

---

## Authentication

All protected routes require `Authorization: Bearer <jwt>` header.
JWT payload: `{ id, role, plan }` — signed with `JWT_SECRET`.
Roles: `student`, `teacher`, `admin`.

---

## Public Endpoints

### GET /health

Health check.

**Response 200**
```json
{ "status": "healthy", "service": "billing-service" }
```

---

### GET /plans

List all active subscription plans sorted by price ascending. No authentication required.

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "_id": "664abc...",
      "code": "PLUS",
      "name": "PLUS 3 tháng",
      "price": 199000,
      "durationMonths": 3,
      "isActive": true,
      "features": ["AI grading", "Band score report"],
      "benefits": { "skills": ["reading", "listening"], "maxHours": -1, "maxFullTests": 2 },
      "ui": { "borderColor": "#6366F1", "buttonText": "Đăng ký ngay", "badge": "Phổ biến" }
    }
  ]
}
```

---

## Student Endpoints (require JWT)

### GET /my-subscription

Get the authenticated user's current subscription.

**Auth required**: Yes

**Response 200 — Active subscription**
```json
{
  "success": true,
  "data": {
    "_id": "664def...",
    "userId": "664user...",
    "planId": { "_id": "664abc...", "name": "PLUS 3 tháng", "durationMonths": 3, "benefits": {...} },
    "status": "ACTIVE",
    "validUntil": "2025-06-01T00:00:00.000Z",
    "fullTestUsed": 0
  }
}
```

**Response 200 — No subscription (FREE user)**
```json
{
  "success": true,
  "data": null,
  "planFallback": {
    "code": "FREE",
    "name": "Miễn phí",
    "price": 0,
    "durationMonths": null,
    "benefits": { "skills": [], "maxHours": 0, "maxFullTests": 0 }
  }
}
```

> Note: This endpoint auto-expires subscriptions whose `validUntil` < now, changing their status to `EXPIRED` in-place.

---

### GET /my-plan

Alias for `GET /my-subscription`. Same response shape.

---

### GET /my-skills

Get the list of skills the authenticated user is allowed to access.

**Auth required**: Yes

**Response 200**
```json
{
  "success": true,
  "data": {
    "allowedSkills": ["reading", "listening"],
    "isPro": false,
    "plan": "PLUS",
    "planName": "PLUS 3 tháng"
  }
}
```

**FREE user response 200**
```json
{
  "success": true,
  "data": {
    "allowedSkills": [],
    "isPro": false,
    "plan": "FREE",
    "planName": "Miễn phí"
  }
}
```

---

### GET /skill-check/:skillName

Verify whether the authenticated user can access a specific skill.
Used internally by other services via the API Gateway.

**Auth required**: Yes  
**skillName**: `reading` | `listening` | `writing` | `speaking`

**Response 200 — Allowed**
```json
{
  "success": true,
  "allowed": true,
  "skill": "reading",
  "plan": "PLUS"
}
```

**Response 403 — SKILL_NOT_ALLOWED**
```json
{
  "success": false,
  "code": "SKILL_NOT_ALLOWED",
  "requiredSkill": "writing",
  "allowedSkills": ["reading", "listening"],
  "userPlan": "PLUS"
}
```

**Response 403 — PLAN_NOT_FOUND**
```json
{
  "success": false,
  "code": "PLAN_NOT_FOUND",
  "message": "Plan UNKNOWN not found in database"
}
```

---

### POST /example/writing/submit

Example protected writing submission endpoint — requires writing skill access.

**Auth required**: Yes (writing skill in plan, or PRO)

**Response 201**
```json
{ "success": true, "message": "Writing example submitted" }
```

**Response 403** — see `/skill-check/:skillName` 403 format.

---

## Admin Endpoints (require `admin` role)

### POST /admin/plans

Create a new subscription plan.

**Auth required**: admin

**Request Body**
```json
{
  "code": "PRO",
  "name": "PRO 6 tháng",
  "price": 399000,
  "durationMonths": 6,
  "features": ["AI grading", "All skills", "Priority support"],
  "benefits": {
    "skills": ["reading", "listening", "writing", "speaking"],
    "maxHours": -1,
    "maxFullTests": 10
  },
  "ui": {
    "borderColor": "#F59E0B",
    "buttonText": "Nâng cấp ngay",
    "badge": "Tốt nhất"
  }
}
```

**Response 201**
```json
{ "success": true, "data": { "_id": "...", "code": "PRO", ... } }
```

**Response 400** — Missing required fields or duplicate code.

---

### GET /admin/plans

List all plans including inactive. Admin only.

**Response 200**
```json
{ "success": true, "data": [ /* all plans */ ] }
```

---

### PUT /admin/plans/:planId

Update an existing plan.

**Response 200**
```json
{ "success": true, "data": { /* updated plan */ } }
```

**Response 404** — Plan not found.

---

### PATCH /admin/plans/:planId/toggle-active

Toggle `isActive` between true/false.

**Response 200**
```json
{ "success": true, "data": { "isActive": false, ... } }
```

---

### DELETE /admin/plans/:planId

Permanently delete a plan.

**Response 200**
```json
{ "success": true, "message": "Plan deleted" }
```

**Response 404** — Plan not found.

---

### GET /admin/stats

Get billing statistics.

**Response 200**
```json
{
  "success": true,
  "data": {
    "totalSubscriptions": 142,
    "activeSubscriptions": 98,
    "totalRevenue": 19502000,
    "planBreakdown": [
      { "planCode": "PLUS", "count": 75, "revenue": 14925000 },
      { "planCode": "PRO", "count": 23, "revenue": 9177000 }
    ]
  }
}
```

---

### GET /admin/subscriptions

List all subscriptions enriched with user data from auth-service.

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "_id": "664def...",
      "userId": { "_id": "664user...", "name": "Nguyen Van A", "email": "a@test.com" },
      "planId": { "name": "PLUS 3 tháng", "durationMonths": 3 },
      "status": "ACTIVE",
      "validUntil": "2025-06-01T00:00:00.000Z",
      "daysRemaining": 87
    }
  ]
}
```

---

### POST /admin/remind/:userId

Send a subscription expiry reminder notification.

**Path param**: `userId` — valid MongoDB ObjectId

**Response 200**
```json
{ "success": true, "message": "Reminder sent" }
```

**Response 400** — Invalid userId format.  
**Response 404** — No subscription for this user.

**Event published**: `billing.subscription.reminder`
```json
{ "userId": "664user...", "validUntil": "2025-06-01T00:00:00.000Z", "planName": "PLUS" }
```

---

### POST /admin/subscriptions/:subscriptionId/cancel

Cancel an active subscription.

**Request Body**
```json
{
  "reason": "POLICY_VIOLATION",
  "editedTitle": "Tài khoản bị khoá",
  "editedMessage": "Tài khoản của bạn đã vi phạm điều khoản dịch vụ."
}
```

**reason** enum: `POLICY_VIOLATION` | `SYSTEM_ERROR` | `USER_REQUEST_REFUND`

**Response 200**
```json
{
  "success": true,
  "data": {
    "status": "CANCELLED",
    "cancellationReason": "POLICY_VIOLATION",
    "cancelledAt": "2025-04-01T00:00:00.000Z"
  }
}
```

**Response 400** — Missing fields, invalid reason, or subscription is not ACTIVE.

**Event published**: `billing.subscription.cancelled`

---

### POST /admin/subscriptions/:subscriptionId/restore

Restore a cancelled subscription.

**Conditions**: status must be `CANCELLED` AND `validUntil` must be in the future.

**Response 200**
```json
{ "success": true, "data": { "status": "ACTIVE", ... } }
```

**Response 400** — Not CANCELLED, or validUntil is expired.

**Event published**: `billing.subscription.restored`

---

## Internal Endpoints (no auth — service-to-service only)

### POST /internal/subscriptions/activate

Activate or update a user subscription after payment confirmation. Uses upsert — safe to call multiple times.

**Request Body**
```json
{
  "userId": "664user000000000000001",
  "planCode": "PLUS",
  "validUntil": "2025-07-01T00:00:00.000Z"
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "_id": "664def...",
    "userId": "664user...",
    "planId": "664abc...",
    "status": "ACTIVE",
    "validUntil": "2025-07-01T00:00:00.000Z"
  }
}
```

**Response 400** — Missing `userId`, `planCode`, or `validUntil`; or invalid ObjectId format.  
**Response 404** — `planCode` does not exist in the plans collection.

---

## Error Responses

All errors follow:
```json
{
  "success": false,
  "message": "Human-readable error description"
}
```

| Code | Meaning |
|------|---------|
| 400 | Bad request — missing/invalid fields |
| 401 | Missing or invalid JWT |
| 403 | Forbidden — insufficient role or skill access denied |
| 404 | Resource not found |
| 500 | Internal server error |

---

## RabbitMQ Events Published

| Event | Trigger |
|-------|---------|
| `billing.subscription.reminder` | Admin manually triggers reminder |
| `billing.subscription.cancelled` | Admin cancels active subscription |
| `billing.subscription.restored` | Admin restores cancelled subscription |
