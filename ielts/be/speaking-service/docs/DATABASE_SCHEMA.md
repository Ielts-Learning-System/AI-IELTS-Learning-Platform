# Speaking Service — Database Schema

## Collections

---

### `speakingtests`

Stores IELTS Speaking test content for the 3-part format.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `_id` | ObjectId | PK | Auto-generated |
| `title` | String | required, trimmed, indexed | Display name for the test |
| `part1` | [String] | required, min length 1 | Warm-up questions |
| `part2` | String | required, trimmed, non-empty | Cue card prompt |
| `part3` | [String] | required, min length 1 | Discussion questions |
| `createdAt` | Date | auto | Timestamp |
| `updatedAt` | Date | auto | Timestamp |

**Indexes:** `title` (single field)

---

### `speakingsubmissions`

Stores student submission state, audio uploads, and grading results.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `_id` | ObjectId | PK | Auto-generated |
| `studentId` | ObjectId | required, ref User, indexed | Submitting student |
| `testId` | ObjectId | ref SpeakingTest, indexed, nullable | Source test (null for legacy assigned submissions) |
| `questions` | [String] | default [] | Question text snapshot at submission time |
| `answers` | [{ questionKey, audioUrl }] | default [] | Per-question audio answers (p1_0, p2, p3_0, …) |
| `audioUrl` | String | default '' | Legacy single-audio URL |
| `status` | String | enum: Pending/Graded, default Pending, indexed | Workflow state |
| `grading` | SpeakingGrading | optional | Populated on grading |
| `createdAt` | Date | auto | Timestamp |
| `updatedAt` | Date | auto | Timestamp |

**Indexes:** `studentId` (single field), `testId` (single field), `status` (single field)

---

### `SpeakingGrading` (embedded subdocument)

| Field | Type | Constraints | Description |
|---|---|---|---|
| `FC` | Number | required, 0–9 | Fluency and Coherence |
| `LR` | Number | required, 0–9 | Lexical Resource |
| `GRA` | Number | required, 0–9 | Grammatical Range and Accuracy |
| `PR` | Number | required, 0–9 | Pronunciation |
| `overallBand` | Number | required, 0–9 | Average of 4 criteria, rounded to 0.5 |
| `teacherFeedback` | String | default '' | Optional written feedback |
| `gradedBy` | ObjectId | required, ref User | Teacher who graded |
| `gradedAt` | Date | required | Grading timestamp |

---

## Band Score Formula

```
overallBand = round((FC + LR + GRA + PR) / 4, nearest 0.5)
```

Examples:
- (7 + 7 + 7 + 7) / 4 = 7.0
- (7 + 6 + 7 + 6) / 4 = 6.5
- (9 + 9 + 9 + 9) / 4 = 9.0

---

## Relationships

```
SpeakingTest (1) ──< SpeakingSubmission (N)  via testId
User (1) ──< SpeakingSubmission (N)          via studentId
User (1) ──< SpeakingSubmission (N)          via grading.gradedBy
```
