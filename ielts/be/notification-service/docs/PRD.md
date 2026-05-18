# Product Requirements Document (PRD) — Notification Service

## 1. Overview
Notification Service is the centralized event-driven communication hub for the IELTS platform. It stores in-app notifications, tracks read state, manages user notification preferences, and supports push subscription lifecycle.

## 2. Goals
- Deliver stable in-app notification APIs for learners and teachers.
- Support role-based teacher/admin workflows for student notifications.
- Provide fallback-safe public responses for unauthenticated clients.
- Persist notification logs and preference state for traceability.

## 3. Actors
- Student: reads notifications, updates preferences, manages push subscription.
- Teacher/Admin: sends in-app notices to specific students and reviews student notifications.
- Internal services/events: feed notification stream via event handlers/consumers.

## 4. Core Features
### F1. Notification Inbox
- Paginated list endpoint with read/unread filter.
- Unauthenticated fallback returns empty payload shape.
- Unread count endpoint with fallback value 0 when unauthenticated.

### F2. Read State Management
- Mark one notification as read.
- Mark all unread in-app notifications as read.

### F3. Notification Preferences
- Retrieve user preferences (auto-create defaults when absent).
- Update channels and categories preferences.

### F4. Push Subscription Management
- Upsert push subscription by endpoint per user.
- Remove subscription by endpoint.

### F5. Teacher/Admin Operations
- List student notifications by userId.
- Send in-app reminder/system notification to a student.
- Role restriction: only Admin or Teacher.

## 5. Functional Requirements
- All protected routes require JWT Bearer token.
- JWT payload supports id or userId and role.
- Notification list only returns channel=in-app for inbox routes.
- Teacher send request requires userId and message.
- Validation errors return 400; unauthorized 401; forbidden 403; not found 404.

## 6. Non-Functional Requirements
- Reliability: non-auth public endpoints should not break UI rendering.
- Scalability: indexed queries for user/read-state based retrieval.
- Security: strict JWT verification and role checks.
- Observability: persistent logs and timestamps in MongoDB.

## 7. Acceptance Criteria
- Test suite passes with schema/unit/api/e2e/regression and existing tests.
- Unauthenticated requests to / and /unread-count return stable fallback payloads.
- Teacher/Admin-only endpoints enforce role checks.
- Read/unread state transitions persist correctly.
