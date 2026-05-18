# Billing Service — Database Schema

## Connection

- **Primary DB**: `MONGO_URI` (billing data)
- **Reporting connection**: `MONGO_URI_AUTH` (read-only auth user data via separate Mongoose connection)

---

## Collection: `plans`

Stores subscription plan definitions.

### Schema (Plan.js)

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| `code` | String | ✅ | — | Unique, used for lookups (e.g. `FREE`, `PLUS`, `PRO`) |
| `name` | String | ✅ | — | Display name |
| `price` | Number | ✅ | — | Price in VND |
| `durationMonths` | Number | ✅ | — | Subscription length in months |
| `isActive` | Boolean | — | `true` | Whether plan appears in public listing |
| `features` | [String] | — | `[]` | Marketing feature bullets |
| `benefits.skills` | [String] | — | `[]` | Enum: `reading`, `listening`, `writing`, `speaking` |
| `benefits.maxHours` | Number | — | `-1` | Max practice hours (-1 = unlimited) |
| `benefits.maxFullTests` | Number | — | `0` | Max full tests per period |
| `ui.borderColor` | String | — | — | Hex color for plan card border |
| `ui.buttonText` | String | — | — | CTA button label |
| `ui.badge` | String | — | — | Badge text (e.g. "Popular") |
| `createdAt` | Date | — | auto | Mongoose timestamps |
| `updatedAt` | Date | — | auto | Mongoose timestamps |

### Indexes

| Index | Fields | Type |
|-------|--------|------|
| `code_1` | `code` | Unique |

### Example Document

```json
{
  "_id": "664abc123def000000000001",
  "code": "PLUS",
  "name": "PLUS 3 tháng",
  "price": 199000,
  "durationMonths": 3,
  "isActive": true,
  "features": ["AI grading", "Band score report", "Unlimited practice"],
  "benefits": {
    "skills": ["reading", "listening"],
    "maxHours": -1,
    "maxFullTests": 2
  },
  "ui": {
    "borderColor": "#6366F1",
    "buttonText": "Đăng ký ngay",
    "badge": "Phổ biến"
  },
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-03-01T00:00:00.000Z"
}
```

---

## Collection: `subscriptions`

Tracks each user's current subscription. One record per user (userId is unique).

### Schema (Subscription.js)

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| `userId` | ObjectId | ✅ | — | Unique — one subscription per user |
| `planId` | ObjectId (ref: Plan) | ✅ | — | Foreign key to `plans` |
| `status` | String | — | `ACTIVE` | Enum: `ACTIVE`, `EXPIRED`, `CANCELLED` |
| `fullTestUsed` | Number | — | `0` | Count of full tests consumed |
| `validUntil` | Date | ✅ | — | Expiry date |
| `cancelledAt` | Date | — | `null` | Timestamp when cancelled |
| `cancellationReason` | String | — | `null` | Enum: `null`, `POLICY_VIOLATION`, `SYSTEM_ERROR`, `USER_REQUEST_REFUND` |
| `cancellationTitle` | String | — | — | Admin-written title for cancellation notification |
| `cancellationMessage` | String | — | — | Admin-written body for cancellation notification |
| `createdAt` | Date | — | auto | Mongoose timestamps |
| `updatedAt` | Date | — | auto | Mongoose timestamps |

### Indexes

| Index | Fields | Type |
|-------|--------|------|
| `userId_1` | `userId` | Unique |

### Status Transitions

```
                  ┌─────────────┐
   internal/      │             │  validUntil < now
   activate ────▶ │   ACTIVE    │ ──────────────────▶  EXPIRED
                  │             │
                  └──────┬──────┘
                         │ admin cancel
                         ▼
                  ┌─────────────┐
                  │  CANCELLED  │
                  └──────┬──────┘
                         │ admin restore (validUntil > now)
                         ▼
                  ┌─────────────┐
                  │   ACTIVE    │
                  └─────────────┘
```

### Cancellation Reason Enum

| Value | Meaning |
|-------|---------|
| `POLICY_VIOLATION` | User violated platform terms of service |
| `SYSTEM_ERROR` | Technical error requiring subscription reset |
| `USER_REQUEST_REFUND` | User-initiated cancellation with refund |

### Example Document

```json
{
  "_id": "664def456abc000000000002",
  "userId": "664user0000000000000001",
  "planId": "664abc123def000000000001",
  "status": "ACTIVE",
  "fullTestUsed": 1,
  "validUntil": "2025-06-01T00:00:00.000Z",
  "cancelledAt": null,
  "cancellationReason": null,
  "cancellationTitle": null,
  "cancellationMessage": null,
  "createdAt": "2025-03-01T00:00:00.000Z",
  "updatedAt": "2025-03-01T00:00:00.000Z"
}
```

---

## Virtual Plan: FREE

There is no `FREE` plan document in the database. The system uses a hardcoded fallback:

```javascript
const planFallback = {
  code: 'FREE',
  name: 'Miễn phí',
  price: 0,
  durationMonths: null,
  benefits: { skills: [], maxHours: 0, maxFullTests: 0 },
};
```

This is returned when `GET /my-subscription` finds no subscription record for the user.

---

## Cross-Service Read (Reporting Connection)

The `getAuthUser()` function opens a secondary Mongoose connection to `MONGO_URI_AUTH` and returns a Mongoose model on the `users` collection. This is used read-only in `GET /admin/subscriptions` to enrich subscription data with user name and email.

If the auth DB is unavailable, the endpoint gracefully falls back to including subscriptions with `{ _id: userId, name: 'Unknown User', email: 'N/A' }`.
