# API Contract — Notification Service

Base path: /
Content-Type: application/json
Auth: Bearer JWT for protected operations

## 1. Health
### GET /health
Response 200
```json
{ "status": "Notification Service is ALIVE!" }
```

## 2. Inbox
### GET /
- Without token: returns stable empty payload
- With token: returns paginated in-app notifications for current user

Success 200
```json
{
  "notifications": [],
  "pagination": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 }
}
```

Query params
- page (default 1, min 1)
- limit (default 20, min 1, max 100)
- isRead=true|false

### GET /unread-count
- Without token: { unreadCount: 0 }
- With token: unread count for current user in-app notifications

Success 200
```json
{ "unreadCount": 2 }
```

## 3. Read Actions (Protected)
### PATCH /:id/read
Success 200
```json
{ "notification": { "_id": "...", "isRead": true, "readAt": "2026-03-09T10:20:00.000Z" } }
```

Error 404
```json
{ "message": "Notification not found" }
```

### PATCH /read-all
Success 200
```json
{ "modifiedCount": 3 }
```

## 4. Preferences (Protected)
### GET /preferences
Success 200
```json
{ "preferences": { "channels": { "email": true, "push": true, "inApp": true }, "categories": { "payment": true, "grading": true, "reminder": true, "system": true } } }
```

### PUT /preferences
Request body example
```json
{ "channels": { "email": false, "push": true, "inApp": true } }
```

Success 200
```json
{ "preferences": { "channels": { "email": false, "push": true, "inApp": true } } }
```

## 5. Push Subscriptions (Protected)
### POST /push/subscribe
Request body
```json
{ "endpoint": "https://push/sub", "keys": { "p256dh": "...", "auth": "..." } }
```

Success 201
```json
{ "subscription": { "_id": "...", "endpoint": "https://push/sub" } }
```

Error 400
```json
{ "message": "Invalid push subscription payload" }
```

### DELETE /push/subscribe
Request body
```json
{ "endpoint": "https://push/sub" }
```

Success 200
```json
{ "message": "Unsubscribed successfully" }
```

Error 400
```json
{ "message": "Endpoint is required" }
```

## 6. Teacher/Admin Endpoints (Protected)
### GET /teacher/users/:userId/notifications
- Allowed roles: Admin, Teacher

Success 200
```json
{ "notifications": [] }
```

Error 403
```json
{ "message": "Forbidden" }
```

### POST /teacher/send
- Allowed roles: Admin, Teacher

Request body
```json
{ "userId": "66f2c7d8cf7612b7739a81fd", "message": "Please complete homework", "title": "Reminder" }
```

Success 201
```json
{ "notification": { "_id": "...", "type": "system", "channel": "in-app" } }
```

Error 400
```json
{ "message": "userId and message are required" }
```

## 7. Common Errors
### 401 Unauthorized
```json
{ "message": "Access denied. No token provided." }
```
or
```json
{ "message": "Invalid or expired token." }
```

### 500 Internal Error
```json
{ "message": "Internal server error" }
```
