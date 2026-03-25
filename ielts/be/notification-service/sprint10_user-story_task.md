# Sprint 10: notification-service — Event-Driven Multi-Channel Notification Hub

Sprint goal: Deliver a production-grade notification service that consumes domain events from all platform services via RabbitMQ, delivers multi-channel notifications (Email, In-App, Push), manages notification history and user preferences, and runs scheduled CRON reminders.

---

## 1 — RabbitMQ Event Registry (Architecture)

### Exchange

| Property | Value |
| --- | --- |
| Exchange Name | `ielts_events` |
| Exchange Type | **Topic** |
| Durable | `true` |

A **Topic Exchange** is chosen because routing keys follow a hierarchical `<service>.<entity>.<action>` pattern, allowing the notification-service to bind with wildcards (e.g., `payment.*.*`) for flexible subscription.

### Core Routing Keys / Events

| Routing Key | Source Service | Description |
| --- | --- | --- |
| `auth.user.created` | auth-service | A new student or teacher has registered |
| `auth.user.verified` | auth-service | Email/OTP verification completed |
| `payment.transaction.declared` | payment-service | Student declared a payment (pending admin review) |
| `payment.transaction.approved` | payment-service | Admin approved VIP payment |
| `payment.transaction.rejected` | payment-service | Admin rejected VIP payment |
| `writing.submission.created` | writing-service | Student submitted a writing task |
| `writing.grading.completed` | writing-service | Teacher finished grading a writing submission |
| `speaking.submission.created` | speaking-service | Student submitted a speaking task |
| `speaking.grading.completed` | speaking-service | Teacher finished grading a speaking submission |
| `reading.test.completed` | reading-service | Student completed a reading test (auto-graded) |
| `listening.test.completed` | listening-service | Student completed a listening test (auto-graded) |

### Standard Event Payload Structure

```json
{
  "eventId": "uuid-v4",
  "eventType": "writing.grading.completed",
  "timestamp": "2026-03-25T10:30:00.000Z",
  "source": "writing-service",
  "data": {
    "userId": "ObjectId",
    "entityType": "WritingSubmission",
    "entityId": "ObjectId",
    "metadata": {
      "bandScore": 6.5,
      "taskType": "Task 2"
    }
  }
}
```

### Consumer Queue Configuration

| Property | Value |
| --- | --- |
| Queue Name | `notification_queue` |
| Durable | `true` |
| Prefetch | `10` |
| Dead-Letter Exchange | `ielts_events_dlx` |
| Dead-Letter Queue | `notification_queue_dlq` |
| Max Retries | `3` (via `x-death` header count) |

---

## 2 — User Stories in Scope

| Story ID | User Story | Story Points |
| --- | --- | --- |
| E10-US01 | As a Student, I want to receive an email welcome notification when I register so that I feel onboarded. | 2 |
| E10-US02 | As a Student, I want in-app notifications when my Writing or Speaking grading is complete so that I can review results immediately. | 3 |
| E10-US03 | As a Student, I want in-app and email notifications when my VIP payment is approved or rejected so that I know my account status. | 3 |
| E10-US04 | As a Student, I want to view, filter (read/unread), and paginate my notification history so that I can track all updates. | 3 |
| E10-US05 | As a Student, I want to manage my notification preferences (email on/off, push on/off, per-category) so that I only receive relevant messages. | 3 |
| E10-US06 | As a Student, I want to receive push notifications on my browser/device for important events so that I stay informed even when the app is not open. | 5 |
| E10-US07 | As a Student, I want to receive scheduled reminder notifications before upcoming practice deadlines so that I stay engaged. | 3 |
| E10-US08 | As an Admin, I want all notification events processed asynchronously via RabbitMQ so that core service flows are never blocked. | 5 |
| E10-US09 | As a Developer, I want the notification-service to gracefully handle RabbitMQ connection failures with retry and dead-letter strategies so that no events are lost. | 5 |

---

## 3 — Technical Breakdown

### E10-US01: Welcome email on registration

- [ ] Consume `auth.user.created` event from RabbitMQ.
- [ ] Render welcome email from `NotificationTemplate` (type: `welcome_email`).
- [ ] Send email via NodeMailer/SendGrid transport.
- [ ] Log notification delivery in `NotificationLog` collection.

### E10-US02: Grading-complete in-app notifications

- [ ] Consume `writing.grading.completed` and `speaking.grading.completed` events.
- [ ] Create `NotificationLog` entry with `channel: 'in-app'`, linking to result entity.
- [ ] Emit real-time event via Socket.io to the user's connected session (room = `user:<userId>`).
- [ ] If user is offline, notification is persisted and shown on next login.

### E10-US03: Payment state-change notifications

- [ ] Consume `payment.transaction.approved` and `payment.transaction.rejected` events.
- [ ] Create in-app notification with plan name and outcome (no sensitive admin details).
- [ ] Check user preference; if email enabled for `payment` category, also send email.
- [ ] Emit Socket.io event to user room.

### E10-US04: Notification history (list, filter, paginate)

- [ ] Implement `GET /api/notifications` — list user notifications with `?page=&limit=&isRead=` query params.
- [ ] Implement `PATCH /api/notifications/:id/read` — mark single notification as read.
- [ ] Implement `PATCH /api/notifications/read-all` — mark all unread notifications as read for user.
- [ ] Implement `GET /api/notifications/unread-count` — return unread badge count.
- [ ] All endpoints require JWT auth middleware (extract `userId` from token).

### E10-US05: User notification preferences

- [ ] Define `NotificationPreference` schema with per-category, per-channel toggles.
- [ ] Implement `GET /api/notifications/preferences` — get current user preferences.
- [ ] Implement `PUT /api/notifications/preferences` — update preferences.
- [ ] Seed default preferences on first notification or on `auth.user.created` event.
- [ ] Check preferences before dispatching any notification.

### E10-US06: Browser push notifications (FCM/WebPush)

- [ ] Implement `POST /api/notifications/push/subscribe` — store push subscription (endpoint, keys).
- [ ] Implement `DELETE /api/notifications/push/subscribe` — unsubscribe.
- [ ] Integrate `web-push` library with VAPID keys.
- [ ] On qualifying event + user preference enabled, send push notification payload.

### E10-US07: CRON scheduled reminders

- [ ] Set up `node-cron` for daily reminder jobs (e.g., 08:00 UTC).
- [ ] Query users who have not practiced in 3+ days → send engagement reminder.
- [ ] Query users with upcoming subscription expiry (7 days) → send renewal reminder.
- [ ] All CRON notifications respect user preferences.

### E10-US08: Asynchronous event processing via RabbitMQ

- [ ] Establish RabbitMQ connection with auto-reconnect and exponential backoff.
- [ ] Assert `ielts_events` topic exchange (durable).
- [ ] Assert `notification_queue` (durable) and bind with routing keys: `auth.user.created`, `payment.transaction.*`, `writing.grading.completed`, `speaking.grading.completed`, `reading.test.completed`, `listening.test.completed`.
- [ ] Implement message consumer with manual acknowledgment (`ack` on success, `nack` + requeue on transient failure).
- [ ] Route consumed messages to the appropriate notification handler based on `eventType`.

### E10-US09: Dead-letter and resilience

- [ ] Assert dead-letter exchange (`ielts_events_dlx`) and dead-letter queue (`notification_queue_dlq`).
- [ ] Configure `notification_queue` with `x-dead-letter-exchange` and `x-dead-letter-routing-key` arguments.
- [ ] On message failure after max retries (check `x-death` header count >= 3), reject to DLQ.
- [ ] Log DLQ entries for manual inspection and alerting.
- [ ] Implement graceful shutdown: close RabbitMQ channel and connection on `SIGTERM`/`SIGINT`.

---

## 4 — Shared Technical Tasks

### Database Schemas

- [ ] **NotificationLog** schema: `userId` (ObjectId, indexed), `type` (String, enum), `title` (String), `message` (String), `channel` (String, enum: `in-app`, `email`, `push`), `entityType` (String), `entityId` (ObjectId), `isRead` (Boolean, default: false, indexed), `readAt` (Date), `metadata` (Mixed), `createdAt`, `updatedAt`.
- [ ] **NotificationTemplate** schema: `key` (String, unique), `channel` (String, enum), `subject` (String), `body` (String, supports `{{variable}}` placeholders), `isActive` (Boolean).
- [ ] **NotificationPreference** schema: `userId` (ObjectId, unique, indexed), `channels` (Object: `{ email: Boolean, push: Boolean, inApp: Boolean }`), `categories` (Object: `{ payment: Boolean, grading: Boolean, reminder: Boolean, system: Boolean }`).
- [ ] **PushSubscription** schema: `userId` (ObjectId, indexed), `endpoint` (String), `keys` (Object: `{ p256dh, auth }`), `createdAt`.
- [ ] Add compound indexes: `{ userId: 1, isRead: 1, createdAt: -1 }` on NotificationLog.

### REST API Surface

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/notifications` | Student | List notifications (paginated, filterable) |
| GET | `/api/notifications/unread-count` | Student | Get unread notification count |
| PATCH | `/api/notifications/:id/read` | Student | Mark one notification as read |
| PATCH | `/api/notifications/read-all` | Student | Mark all notifications as read |
| GET | `/api/notifications/preferences` | Student | Get notification preferences |
| PUT | `/api/notifications/preferences` | Student | Update notification preferences |
| POST | `/api/notifications/push/subscribe` | Student | Register push subscription |
| DELETE | `/api/notifications/push/subscribe` | Student | Remove push subscription |
| GET | `/health` | Public | Service health check |

### Infrastructure

- [ ] Add `notification-service` to `docker-compose.yml` with `depends_on: [rabbitmq]`.
- [ ] Add `NOTIFICATION_SERVICE_URL` environment variable to api-gateway.
- [ ] Configure Socket.io on the same HTTP server (port 3006) with CORS.
- [ ] Add Redis adapter for Socket.io if horizontal scaling is needed (future).

### Integration and Testing

- [ ] Unit tests for each event handler (mocked RabbitMQ channel).
- [ ] Unit tests for notification preference enforcement.
- [ ] Integration tests for REST API endpoints with mongodb-memory-server.
- [ ] Integration test for RabbitMQ consumer with test container.
- [ ] Test Socket.io emission on grading-complete event.
- [ ] Test dead-letter flow on repeated consumer failure.
- [ ] Test CRON job scheduling logic (mock timers).

---

## 5 — Definition of Done for Sprint 10

- RabbitMQ consumer is connected, consuming all registered events, with dead-letter resilience.
- Email, in-app, and push channels are functional and respect user preferences.
- Students can view, filter, and manage their notification history via REST API.
- Socket.io delivers real-time in-app notifications to online users.
- CRON reminders run on schedule and target appropriate users.
- All endpoints are guarded by JWT auth middleware.
- Integration and unit tests pass in CI with RabbitMQ + MongoDB service containers.
- Notification-service is registered in docker-compose and routed via api-gateway.
