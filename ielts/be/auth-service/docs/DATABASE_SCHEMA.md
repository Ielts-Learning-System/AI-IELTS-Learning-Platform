# auth-service — Database Schema

## Database: `ielts_auth_db`

---

## Collection: `users`

| Field | Type | Required | Default | Constraints |
|---|---|---|---|---|
| `_id` | ObjectId | auto | — | Primary key |
| `email` | String | ✅ | — | unique, lowercase, trim |
| `password` | String | ✅ | — | bcrypt-hashed on save |
| `name` | String | ❌ | — | trim |
| `role` | String | ❌ | `'Student'` | enum: `['Admin','Teacher','Student']` |
| `isActive` | Boolean | ❌ | `true` | — |
| `plan` | String | ❌ | `'FREE'` | enum: `['FREE','PLUS','PRO']` |
| `vipValidUntil` | Date | ❌ | `null` | Set by billing-service via internal PATCH |
| `avatar` | String | ❌ | auto-generated | `https://ui-avatars.com/api/?name=...` |
| `createdAt` | Date | auto | — | Mongoose timestamps |
| `updatedAt` | Date | auto | — | Mongoose timestamps |

### Indexes
- `email` — unique index (enforced by schema)

### Notes
- `role` in the JWT payload comes from this field; force-set to `Student` on registration.
- `plan` is synced from billing-service via `PATCH /internal/users/:id/subscription`. Never mutated directly by the client.
- Password is re-hashed on every save where `isModified('password')` is true.

---

## Collection: `apikeys`

| Field | Type | Required | Default | Constraints |
|---|---|---|---|---|
| `_id` | ObjectId | auto | — | Primary key |
| `userId` | ObjectId | ✅ | — | ref: User |
| `key` | String | ✅ | — | unique, hashed |
| `quotaUsed` | Number | ❌ | 0 | — |
| `quotaLimit` | Number | ❌ | 100 | — |
| `createdAt` | Date | auto | — | — |
| `updatedAt` | Date | auto | — | — |

---

## Collection: `ailogs`

| Field | Type | Required | Default | Constraints |
|---|---|---|---|---|
| `_id` | ObjectId | auto | — | — |
| `userId` | ObjectId | ✅ | — | ref: User |
| `action` | String | ✅ | — | — |
| `createdAt` | Date | auto | — | — |

---

## Collection: `systemconfigs`

| Field | Type | Required | Default | Constraints |
|---|---|---|---|---|
| `_id` | ObjectId | auto | — | — |
| `key` | String | ✅ | — | unique |
| `value` | Mixed | ✅ | — | — |
| `updatedAt` | Date | auto | — | — |
