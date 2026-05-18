# Database Schema — Lesson Service

## 1. Collection: lessons
### Fields
- title: String, required, trimmed
- description: String, required
- videoUrl: String, required
- videoType: String, enum [cloudinary, youtube], default cloudinary
- thumbnailUrl: String, optional
- teacherId: ObjectId, required, ref User
- duration: Number, optional
- status: String, enum [Draft, Published], default Published
- createdAt: Date
- updatedAt: Date

## 2. Validation Rules
- title, description, videoUrl, teacherId are required.
- videoType must be cloudinary or youtube.
- status must be Draft or Published.

## 3. Query Rules (Controller-level)
- Student list endpoint applies filter: { status: 'Published' }
- Teacher list endpoint applies no status filter.
- Search query uses case-insensitive regex on title/description.

## 4. Pagination Rules
- Fixed page size: 6
- page defaults to 1, minimum 1
- response includes page, limit, total, totalPages
