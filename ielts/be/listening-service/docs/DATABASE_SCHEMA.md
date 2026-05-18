# Listening Service — Database Schema

**Database:** `ielts_listening_db`

---

## Collection: `listeningtests`

### Purpose
Stores full IELTS listening practice test definitions, organised into 1–4 parts.

### Schema

```js
{
  _id: ObjectId,
  title: String,           // required
  description: String,
  parts: [PartSchema],
  createdAt: Date,         // timestamps: true
  updatedAt: Date,
}
```

### PartSchema
```js
{
  partNumber: Number,          // 1–4
  title: String,
  audioUrl: String,            // required — CDN URL for the audio file
  questions: [QuestionSchema],
}
```

### QuestionSchema
```js
{
  questionText: String,
  type: {
    type: String,
    enum: ['multiple_choice', 'fill_blank', 'map_labeling', 'matching'],
  },
  options: [String],           // only used for multiple_choice / matching
  correctAnswer: String,       // supports "/" for alternate answers, e.g. "10/ten"
}
```

### Indexes
- `createdAt` (desc) — used in `getAllTests` aggregate sort

---

## Collection: `listeningattempts`

### Purpose
Stores each student's graded attempt for either a full test or an individual part.

### Schema

```js
{
  _id: ObjectId,
  testId: {
    type: ObjectId,
    ref: 'ListeningTest',
    required: true,
  },
  studentId: {
    type: ObjectId,
    ref: 'User',
    required: true,
  },
  partNumber: {
    type: Number,
    default: null,   // null = full test submission; 1–4 = single part submission
    min: 1,
    max: 4,
  },
  studentAnswers: [String],
  rawScore: { type: Number, min: 0, max: 40 },
  bandScore: { type: Number, min: 0, max: 9 },
  timeSpent: { type: Number, default: 0 },   // seconds
  details: [AttemptDetailSchema],
  createdAt: Date,
  updatedAt: Date,
}
```

### AttemptDetailSchema
```js
{
  questionIndex: Number,
  studentAnswer: String,
  correctAnswer: String,
  isCorrect: Boolean,
}
```

### Indexes
- `studentId` — for `/my-attempts` filtered queries
- `testId` — for per-test attempt lookup

---

## Collection: `dictationwords`

### Purpose
Stores vocabulary items used in dictation exercises (spoken by AI, typed by student).

### Schema
```js
{
  _id: ObjectId,
  word: String,              // required, the target word
  audioUrl: String,          // CDN URL for the spoken word audio
  category: String,          // e.g. "geography", "numbers"
  difficulty: String,        // e.g. "easy", "medium", "hard"
  imageUrl: String,          // optional visual hint
  createdAt: Date,
  updatedAt: Date,
}
```
