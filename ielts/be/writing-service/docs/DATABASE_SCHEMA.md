# writing-service — Database Schema

## Database: `ielts_writing_db`

---

## Collection: `writings`

| Field | Type | Required | Default | Constraints |
|---|---|---|---|---|
| `_id` | ObjectId | auto | — | — |
| `title` | String | ✅ | — | — |
| `type` | String | ✅ | — | enum: `['Task 1', 'Task 2']` |
| `category` | String | ❌ | `'Mixed'` | — |
| `timeLimit` | Number | ❌ | 20 (T1) / 40 (T2) | Set via pre-validate hook |
| `contentHtml` | String | ✅ | — | HTML prompt content |
| `isSample` | Boolean | ❌ | `false` | — |
| `sampleInfos` | Array | ❌ | `[]` | Array of SampleInfoSchema |
| `tags` | Array | ❌ | `[]` | String tags |
| `createdAt` | Date | auto | — | — |
| `updatedAt` | Date | auto | — | — |

### SampleInfoSchema (subdocument)
| Field | Type | Required | Default |
|---|---|---|---|
| `bandScore` | Number | ✅ | — |
| `contentHtml` | String | ✅ | — |
| `author` | String | ❌ | `'IELTS Master'` |

---

## Collection: `writingsubmissions`

| Field | Type | Required | Default | Constraints |
|---|---|---|---|---|
| `_id` | ObjectId | auto | — | — |
| `studentId` | ObjectId | ✅ | — | ref: User; index |
| `writingId` | ObjectId | ✅ | — | ref: Writing; index |
| `taskType` | String | ✅ | — | enum: `['Task 1', 'Task 2']` |
| `content` | String | ✅ | — | trim |
| `wordCount` | Number | ✅ | — | min: 0 |
| `status` | String | ❌ | `'Pending'` | enum: `['Pending', 'Graded']`; index |
| `grading` | GradingSchema | ❌ | `undefined` | Set on grading |
| `createdAt` | Date | auto | — | — |
| `updatedAt` | Date | auto | — | — |

### GradingSchema (subdocument)
| Field | Type | Required | Min | Max |
|---|---|---|---|---|
| `criteria.TR` | Number | ✅ | 0 | 9 |
| `criteria.CC` | Number | ✅ | 0 | 9 |
| `criteria.LR` | Number | ✅ | 0 | 9 |
| `criteria.GRA` | Number | ✅ | 0 | 9 |
| `overallBand` | Number | ✅ | 0 | 9 |
| `gradedBy` | ObjectId | ✅ | — | ref: User |
| `gradedAt` | Date | ✅ | — | — |
