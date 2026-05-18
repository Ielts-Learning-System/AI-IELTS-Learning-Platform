# Database Schema — Exam Service

## 1. Collection: exams
### Fields
- title: String, required
- description: String, default ''
- durationMinutes: Number, default 165, min 1
- globalLimitHours: Number, default 24, min 1
- skillDurations.reading: Number, default 60, min 1
- skillDurations.listening: Number, default 30, min 1
- skillDurations.writing: Number, default 60, min 1
- skillDurations.speaking: Number, default 15, min 1
- skillRefs.readingId: String, required
- skillRefs.listeningId: String, required
- skillRefs.writingId: String, required
- skillRefs.speakingId: String, required
- status: String, enum [DRAFT, PUBLISHED, ARCHIVED], default DRAFT, index
- createdBy: String, required, index
- publishedAt: Date
- createdAt: Date
- updatedAt: Date

## 2. Collection: examattempts
### Fields
- examId: ObjectId ref Exam, required, index
- userId: String, required, index
- globalStartTime: Date, required
- globalEndTime: Date, required, index
- submittedAt: Date
- status: String, enum [IN_PROGRESS, SUBMITTED, EXPIRED, GRADED], default IN_PROGRESS, index
- overallBandScores.reading/listening/writing/speaking/overall: Number, min 0 max 9
- lastActivityAt: Date, default now
- metadata: Mixed, default {}
- createdAt: Date
- updatedAt: Date

### Indexes
- { examId: 1, userId: 1, createdAt: -1 }

## 3. Collection: skillattempts
### Fields
- examAttemptId: ObjectId ref ExamAttempt, required, index
- examId: ObjectId ref Exam, required, index
- userId: String, required, index
- skillType: String, enum [reading, listening, writing, speaking], required, index
- skillRefId: String, required
- skillStartTime: Date
- skillEndTime: Date
- deadlineAt: Date, index
- status: String, enum [NOT_STARTED, IN_PROGRESS, SUBMITTED, EXPIRED, GRADED], default NOT_STARTED, index
- timeRemainingSeconds: Number, default 0, min 0
- answerSnapshot: Mixed, default {}
- unansweredCount: Number, default 0, min 0
- autoSubmitted: Boolean, default false
- gradedBand: Number, min 0 max 9
- gradingMetadata: Mixed, default {}
- lastSavedAt: Date
- createdAt: Date
- updatedAt: Date

### Indexes
- unique { examAttemptId: 1, skillType: 1 }

## 4. Data Constraints
- One skill attempt per skill type in each examAttempt.
- Exam status constrained to DRAFT/PUBLISHED/ARCHIVED.
- Attempt status constrained to IN_PROGRESS/SUBMITTED/EXPIRED/GRADED.
- Skill status constrained to NOT_STARTED/IN_PROGRESS/SUBMITTED/EXPIRED/GRADED.
