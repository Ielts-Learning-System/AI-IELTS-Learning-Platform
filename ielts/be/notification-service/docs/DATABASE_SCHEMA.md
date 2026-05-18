# Database Schema — Notification Service

## 1. Collection: notificationlogs
### Fields
- userId: ObjectId, required, index
- type: String, required, enum
  - welcome
  - grading_completed
  - payment_approved
  - payment_rejected
  - payment_declared
  - submission_created
  - test_completed
  - reminder
  - system
  - subscription_cancelled
  - subscription_restored
- title: String, required
- message: String, required
- channel: String, required, enum [in-app, email, push]
- entityType: String, default null
- entityId: ObjectId, default null
- isRead: Boolean, default false, index
- readAt: Date, default null
- metadata: Mixed, default {}
- createdAt: Date
- updatedAt: Date

### Indexes
- { userId: 1, isRead: 1, createdAt: -1 } compound index

## 2. Collection: notificationpreferences
### Fields
- userId: ObjectId, required, unique, index
- channels.email: Boolean, default true
- channels.push: Boolean, default true
- channels.inApp: Boolean, default true
- categories.payment: Boolean, default true
- categories.grading: Boolean, default true
- categories.reminder: Boolean, default true
- categories.system: Boolean, default true
- createdAt: Date
- updatedAt: Date

## 3. Collection: pushsubscriptions
### Fields
- userId: ObjectId, required, index
- endpoint: String, required
- keys.p256dh: String, required
- keys.auth: String, required
- createdAt: Date
- updatedAt: Date

### Indexes
- unique compound index: { userId: 1, endpoint: 1 }

## 4. Data Rules
- Inbox APIs only query notificationlogs where channel=in-app.
- readAt is populated when notification transitions to read.
- Each user has at most one preference document.
- Each user+endpoint pair is unique for push subscriptions.
