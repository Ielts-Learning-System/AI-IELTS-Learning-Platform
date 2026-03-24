# Sprint 9: notification-service

Sprint goal: Deliver in-app notifications for grading completion and payment state changes, including unread state management and integration with prior service event contracts.

---

## User Stories in Scope

| Story ID | User Story | Story Points |
| --- | --- | --- |
| E6-US01 | As a Student, I want an in-app notification when my Writing or Speaking grading is complete so that I know when results are ready. | 3 |
| E6-US02 | As a Student, I want an in-app notification when my VIP payment is approved or rejected so that I understand my account status. | 3 |
| E6-US03 | As a Student, I want to view unread and read notifications in one place so that I can track important updates. | 3 |
| E6-US04 | As an Admin, I want notification events to be generated asynchronously so that grading and payment flows are not blocked by delivery concerns. | 5 |

---

## Technical Breakdown

### E6-US01: Grading-complete notifications

- [ ] Define `Notification` schema with `userId`, `type`, `title`, `message`, `entityType`, `entityId`, `isRead`, `createdAt`, and `readAt`.
- [ ] Implement event ingestion or internal creation endpoint for grading-complete messages from writing-service and speaking-service.
- [ ] Implement `POST /api/notifications/internal` or consumer handlers for internal event creation.
- [ ] Ensure generated notifications include enough context for the frontend to link back to results.

### E6-US02: Payment approval and rejection notifications

- [ ] Extend notification types for payment approved and payment rejected states.
- [ ] Integrate payment-service approval and rejection events or internal calls.
- [ ] Ensure notifications include plan name and current action outcome without leaking sensitive admin-only details.

### E6-US03: Read and unread notification center

- [ ] Implement `GET /api/notifications` for user notification list retrieval.
- [ ] Implement `PATCH /api/notifications/:id/read` to mark one notification as read.
- [ ] Implement `PATCH /api/notifications/read-all` if bulk read is desired in scope.
- [ ] Build notification center UI in the frontend base using shared list, badge, and empty-state components.
- [ ] Add unread indicator to the app shell header or navigation.

### E6-US04: Asynchronous delivery support

- [ ] Define event payload contracts for Writing graded, Speaking graded, Payment approved, and Payment rejected actions.
- [ ] Integrate RabbitMQ or an equivalent message flow if available in the platform stack.
- [ ] Add safe fallback for synchronous internal notification creation if async pipeline is not ready in the same sprint.
- [ ] Add dead-letter or retry strategy for failed message consumption where feasible.

---

## Shared Technical Tasks

### Database and Backend

- [ ] Finalize indexes for `userId`, `isRead`, and `createdAt`.
- [ ] Add auth middleware for user notification retrieval and update actions.
- [ ] Add internal authentication or trusted-caller validation for event ingestion endpoints if HTTP-based integration is used.

### REST API Surface

- [ ] Finalize contracts for list, mark-read, mark-all-read, and internal event creation or consumption paths.
- [ ] Align entity-link fields with Writing, Speaking, and Payment result routes.

### FE Integration into Sprint 0 Base

- [ ] Create Notification API client methods and DTOs.
- [ ] Build notification center page and unread badge.
- [ ] Wire notification refresh into app shell and protected user experience.

### Integration and Testing

- [ ] Test Writing graded event to notification creation.
- [ ] Test Speaking graded event to notification creation.
- [ ] Test Payment approved and rejected events to notification creation.
- [ ] Test read and unread state updates in the frontend.

---

## Definition of Done for Sprint 9

- Grading and payment state changes create in-app notifications.
- Users can view and mark notifications as read.
- Notification integration contracts are stable across dependent services.
