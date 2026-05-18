# API Contract — Lesson Service

Base path: /
Auth: Bearer JWT on all lesson routes

## 1. Health
### GET /health
Response 200
```json
{ "status": "OK", "message": "Lesson Service is healthy" }
```

## 2. Lesson Routes
### GET /
- Role: any authenticated user
- Returns published lessons only
- Query params: page, search

Success 200
```json
{
  "success": true,
  "message": "Lessons fetched successfully",
  "data": [],
  "pagination": { "page": 1, "limit": 6, "total": 0, "totalPages": 0 }
}
```

### GET /teacher
- Role: teacher or admin
- Returns all lessons (Draft + Published)
- Query params: page, search

### GET /:id
- Role: any authenticated user

Success 200
```json
{ "success": true, "message": "Lesson fetched successfully", "data": { "_id": "..." } }
```

Error 400
```json
{ "success": false, "message": "Invalid lesson ID" }
```

Error 404
```json
{ "success": false, "message": "Lesson not found" }
```

### POST /
- Role: teacher or admin

Request body
```json
{
  "title": "IELTS Reading Strategy",
  "description": "How to manage time",
  "videoUrl": "https://cdn.example/video.mp4",
  "videoType": "cloudinary",
  "thumbnailUrl": "https://cdn.example/thumb.jpg",
  "duration": 900,
  "status": "Published"
}
```

Success 201
```json
{ "success": true, "message": "Lesson created successfully", "data": { "_id": "..." } }
```

Error 400
```json
{ "success": false, "message": "title, description, and videoUrl are required" }
```

### DELETE /:id
- Role: teacher or admin

Success 200
```json
{ "success": true, "message": "Lesson deleted successfully", "data": { "_id": "..." } }
```

Error 400
```json
{ "success": false, "message": "Invalid lesson ID" }
```

Error 404
```json
{ "success": false, "message": "Lesson not found" }
```

## 3. Common Auth Errors
### 401
```json
{ "success": false, "message": "Not authorized, no token" }
```
or
```json
{ "success": false, "message": "Not authorized, token failed" }
```

### 403
```json
{ "success": false, "message": "Forbidden: teacher or admin access required" }
```
