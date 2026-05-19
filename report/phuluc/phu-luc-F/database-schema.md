# Sơ đồ Cơ sở Dữ liệu — IELTS-Mate Platform

> **ODM:** Mongoose 8 | **Database:** MongoDB | **Pattern:** Database-per-Service  
> **Tất cả schemas** đều có `timestamps: true` (tự động `createdAt`, `updatedAt`)  
> **Ngày:** 2026-05-18

---

## 1. ielts_auth_db — Auth Service

### 1.1 Collection: users

| Field | Type | Required | Default | Validation | Index |
|---|---|---|---|---|---|
| `_id` | ObjectId | auto | — | — | PK |
| `email` | String | ✅ | — | regex email, lowercase | unique |
| `password` | String | ✅ | — | bcrypt hash, min 6 | — |
| `name` | String | ✅ | — | maxLength 100 | — |
| `role` | String | ✅ | `Student` | enum: [Admin, Teacher, Student] | `{ role: 1, isActive: 1 }` |
| `isActive` | Boolean | — | `true` | — | — |
| `plan` | String | — | `FREE` | enum: [FREE, PLUS, PRO] | — |
| `subscriptionPlan` | String | — | `Free` | enum: [Free, Plus, Pro] | — |
| `vipValidUntil` | Date | — | `null` | — | — |
| `avatar` | String | — | `null` | URL hoặc null | — |
| `createdAt` | Date | auto | — | timestamps | — |
| `updatedAt` | Date | auto | — | timestamps | — |

**Indexes:**
- `{ email: 1 }` unique
- `{ role: 1, isActive: 1 }` composite

### 1.2 Collection: refreshtokens

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `userId` | ObjectId | ✅ | ref: User |
| `token` | String | ✅ | hashed refresh token |
| `expiresAt` | Date | ✅ | TTL 30 ngày |
| `isRevoked` | Boolean | — | default false |

### 1.3 Collection: apikeys

| Field | Type | Mô tả |
|---|---|---|
| `userId` | ObjectId | owner |
| `key` | String | API key hash |
| `quota` | Number | max req/day |
| `usedToday` | Number | reset daily |
| `isActive` | Boolean | — |

---

## 2. ielts_reading_db — Reading Service

### 2.1 Collection: readingtests

**QuestionSchema (embedded):**

| Field | Type | Required | Validation |
|---|---|---|---|
| `questionNumber` | Number | ✅ | min: 1 |
| `questionText` | String | ✅ | — |
| `type` | String | ✅ | enum: [MULTIPLE_CHOICE, FILL_IN_BLANK, MATCHING, TFNG, YNNG] |
| `options` | [String] | — | Chỉ cho MULTIPLE_CHOICE |
| `correctAnswer` | Mixed | ✅ | String hoặc Array |
| `alternateAnswers` | [String] | — | Cho FILL_IN_BLANK |
| `points` | Number | — | default: 1, min: 0, max: 5 |

**PassageSchema (embedded):**

| Field | Type | Required |
|---|---|---|
| `passageNumber` | Number | ✅ |
| `title` | String | ✅ |
| `content` | String | ✅ |
| `questions` | [QuestionSchema] | ✅ |

**ReadingTestSchema:**

| Field | Type | Required | Default | Index |
|---|---|---|---|---|
| `title` | String | ✅ | — | text |
| `description` | String | — | — | — |
| `passages` | [PassageSchema] | ✅ | — | — |
| `totalQuestions` | Number | ✅ | — | — |
| `timeLimit` | Number | — | 60 | — |
| `isPublished` | Boolean | — | false | `{ isPublished: 1 }` |
| `createdBy` | ObjectId | ✅ | — | `{ createdBy: 1, isPublished: 1 }` |

### 2.2 Collection: readingattempts

| Field | Type | Required | Index |
|---|---|---|---|
| `studentId` | ObjectId | ✅ | `{ studentId: 1, testId: 1 }` |
| `testId` | ObjectId | ✅ | `{ testId: 1, createdAt: -1 }` |
| `rawScore` | Number | ✅ | — |
| `bandScore` | Number | ✅ | min: 1, max: 9 |
| `totalQuestions` | Number | ✅ | — |
| `answers` | [AnswerDetail] | ✅ | — |
| `timeSpent` | Number | — | giây |

**AnswerDetail (embedded):**
```
{ questionId: ObjectId, studentAnswer: Mixed, correctAnswer: Mixed, isCorrect: Boolean, points: Number }
```

---

## 3. ielts_writing_db — Writing Service

### 3.1 Collection: writingtasks

| Field | Type | Required |
|---|---|---|
| `title` | String | ✅ |
| `taskType` | String | ✅ enum: [TASK_1, TASK_2] |
| `prompt` | String | ✅ |
| `imageUrl` | String | — (Task 1 chart/graph) |
| `minWords` | Number | — default: 150 (T1), 250 (T2) |
| `topic` | String | — |
| `isPublished` | Boolean | — default: false |
| `createdBy` | ObjectId | ✅ |

### 3.2 Collection: writingsubmissions

**GradingCriteriaSchema (embedded):**

| Field | Type | Validation |
|---|---|---|
| `TR` | Number | min: 0, max: 9, step: 0.5 |
| `CC` | Number | min: 0, max: 9, step: 0.5 |
| `LR` | Number | min: 0, max: 9, step: 0.5 |
| `GRA` | Number | min: 0, max: 9, step: 0.5 |
| `bandScore` | Number | min: 1, max: 9 |
| `feedback` | String | maxLength: 2000 |
| `suggestions` | [String] | maxItems: 5 |

**WritingSubmissionSchema:**

| Field | Type | Required | Index |
|---|---|---|---|
| `studentId` | ObjectId | ✅ | `{ studentId: 1, createdAt: -1 }` |
| `taskId` | ObjectId | ✅ | — |
| `taskType` | String | ✅ | enum: [TASK_1, TASK_2] |
| `content` | String | ✅ | — |
| `wordCount` | Number | ✅ | — |
| `status` | String | ✅ | enum: [pending, grading, graded, failed, teacher_reviewed] — index |
| `grading` | GradingCriteriaSchema | — | — |
| `overriddenBy` | ObjectId | — | Teacher ID |
| `teacherComment` | String | — | maxLength: 1000 |
| `gradedAt` | Date | — | — |

---

## 4. ielts_listening_db — Listening Service

### 4.1 Collection: listeningtests

**QuestionSchema (embedded):**

| Field | Type | Validation |
|---|---|---|
| `questionNumber` | Number | min: 1 |
| `questionText` | String | required |
| `type` | String | enum: [multiple_choice, fill_blank, map_labeling, matching] |
| `options` | [String] | Chỉ cho multiple_choice |
| `correctAnswer` | Mixed | required |
| `points` | Number | default: 1 |

**PartSchema (embedded):**

| Field | Type |
|---|---|
| `partNumber` | Number (1-4) |
| `audioUrl` | String |
| `transcript` | String |
| `questions` | [QuestionSchema] |

**ListeningTestSchema:**

| Field | Type | Index |
|---|---|---|
| `title` | String | text |
| `parts` | [PartSchema] | — |
| `totalQuestions` | Number | — |
| `isPublished` | Boolean | `{ isPublished: 1 }` |
| `createdBy` | ObjectId | `{ createdBy: 1 }` |

### 4.2 Collection: listeningattempts

| Field | Type | Index |
|---|---|---|
| `studentId` | ObjectId | `{ studentId: 1, testId: 1 }` |
| `testId` | ObjectId | — |
| `rawScore` | Number | — |
| `bandScore` | Number | min: 1, max: 9 |
| `parts` | [PartResult] | — |
| `timeSpent` | Number | — |

---

## 5. ielts_speaking_db — Speaking Service

### 5.1 Collection: speakingprompts

| Field | Type | Required |
|---|---|---|
| `title` | String | ✅ |
| `partType` | String | ✅ enum: [PART_1, PART_2, PART_3] |
| `prompt` | String | ✅ |
| `cueCard` | String | — (chỉ PART_2) |
| `followUpQuestions` | [String] | — |
| `isPublished` | Boolean | default: false |

### 5.2 Collection: speakingsubmissions

| Field | Type | Index |
|---|---|---|
| `studentId` | ObjectId | `{ studentId: 1, createdAt: -1 }` |
| `promptId` | ObjectId | — |
| `audioUrl` | String | required |
| `transcript` | String | AI-generated |
| `status` | String | enum: [pending, graded, failed] |
| `grading.fluency` | Number | 0–9 |
| `grading.lexical` | Number | 0–9 |
| `grading.grammar` | Number | 0–9 |
| `grading.pronunciation` | Number | 0–9 |
| `grading.bandScore` | Number | 1–9 |
| `grading.feedback` | String | — |

---

## 6. ielts_billing_db — Billing Service

### 6.1 Collection: plans

| Field | Type | Required | Index |
|---|---|---|---|
| `code` | String | ✅ | unique |
| `name` | String | ✅ | — |
| `price` | Number | ✅ | min: 0 |
| `currency` | String | — | default: VND |
| `isActive` | Boolean | — | default: true |
| `durationMonths` | Number | — | 0 = vĩnh cửu |
| `features` | [String] | — | — |
| `benefits.skills` | [String] | — | — |
| `benefits.maxHours` | Number | — | — |
| `benefits.maxFullTests` | Number | — | — |
| `ui.color` | String | — | hex color |
| `ui.badge` | String | — | — |

**Dữ liệu mặc định:**

```json
[
  { "code": "FREE", "name": "Miễn phí", "price": 0, "durationMonths": 0, "features": ["Reading cơ bản (5 bài/tháng)"] },
  { "code": "PLUS", "name": "Plus", "price": 599000, "durationMonths": 12, "features": ["Reading không giới hạn", "Listening", "Writing (AI chấm)"] },
  { "code": "PRO", "name": "Pro", "price": 999000, "durationMonths": 12, "features": ["Reading", "Listening", "Writing", "Speaking", "Full Mock Test không giới hạn"] }
]
```

---

## 7. ielts_payment_db — Payment Service

### 7.1 Collection: payments

| Field | Type | Required | Index |
|---|---|---|---|
| `userId` | ObjectId | ✅ | `{ userId: 1, createdAt: -1 }` |
| `planCode` | String | ✅ | — |
| `amount` | Number | ✅ | — |
| `currency` | String | — | default: VND |
| `gateway` | String | ✅ | enum: [vnpay, stripe, momo] |
| `gatewayTransactionId` | String | — | unique nếu không null |
| `status` | String | ✅ | enum: [pending, completed, failed, refunded] |
| `webhookProcessed` | Boolean | — | default: false |
| `webhookProcessedAt` | Date | — | — |
| `metadata` | Mixed | — | Gateway-specific data |

---

## 8. ielts_notification_db — Notification Service

### 8.1 Collection: notifications

| Field | Type | Required | Index |
|---|---|---|---|
| `userId` | ObjectId | ✅ | `{ userId: 1, isRead: 1, createdAt: -1 }` |
| `type` | String | ✅ | enum: [GRADING_COMPLETE, PAYMENT_SUCCESS, PAYMENT_FAILED, SUBSCRIPTION_ACTIVATED, SUBSCRIPTION_EXPIRED] |
| `title` | String | ✅ | — |
| `body` | String | ✅ | — |
| `isRead` | Boolean | — | default: false |
| `data` | Mixed | — | contextual data |
| `readAt` | Date | — | — |

---

## 9. ielts_exam_db — Exam Service

### 9.1 Collection: exams (Full Mock Tests)

| Field | Type | Mô tả |
|---|---|---|
| `title` | String | e.g., "Cambridge IELTS 17 Test 1" |
| `readingTestId` | ObjectId | ref reading-service |
| `listeningTestId` | ObjectId | ref listening-service |
| `writingTaskIds` | [ObjectId] | Task 1 + Task 2 |
| `speakingPromptId` | ObjectId | ref speaking-service |
| `isPublished` | Boolean | — |
| `totalDuration` | Number | phút — default: 174 |

### 9.2 Collection: examattempts

| Field | Type | Mô tả |
|---|---|---|
| `studentId` | ObjectId | — |
| `examId` | ObjectId | — |
| `readingAttemptId` | ObjectId | — |
| `listeningAttemptId` | ObjectId | — |
| `writingSubmissionId` | ObjectId | — |
| `speakingSubmissionId` | ObjectId | — |
| `overallBand` | Number | Trung bình 4 kỹ năng |
| `status` | String | enum: [in_progress, completed] |

---

## 10. ielts_lesson_db — Lesson Service

### 10.1 Collection: lessons

| Field | Type | Required |
|---|---|---|
| `title` | String | ✅ |
| `skill` | String | ✅ enum: [reading, listening, writing, speaking, grammar, vocabulary] |
| `level` | String | ✅ enum: [beginner, intermediate, advanced] |
| `content` | String | — (Markdown) |
| `videoUrl` | String | — |
| `duration` | Number | — phút |
| `order` | Number | — sắp xếp trong khóa học |
| `isPublished` | Boolean | default: false |

---

## Tổng hợp Schema

| Database | Collections | Documents | Indexes |
|---|---|---|---|
| ielts_auth_db | 4 | 35 | 5 indexes |
| ielts_reading_db | 2 | 20 | 4 indexes |
| ielts_writing_db | 3 | 18 | 3 indexes |
| ielts_listening_db | 3 | 112 | 3 indexes |
| ielts_speaking_db | 2 | 12 | 2 indexes |
| ielts_billing_db | 5 | 13 | 1 index |
| ielts_payment_db | 2 | 26 | 3 indexes |
| ielts_notification_db | 3 | 45 | 2 indexes |
| ielts_exam_db | 3 | 11 | 2 indexes |
| ielts_lesson_db | 1 | 6 | 1 index |
| ielts_media_db | 0 | 0 | — (filesystem) |
| **Tổng** | **28** | **298** | **26** |

---

*Ngày tạo: 2026-05-18 | Nguồn: Mongoose schema files trong `ielts/be/*/src/models/`*
