# Sprint 2: cloud-media-service

Sprint goal: Deliver secure upload flows for Writing images and Speaking audio, including validation, storage integration, metadata persistence, and frontend upload integration into the Sprint 0 base.

---

## User Stories in Scope

| Story ID | User Story | Story Points |
| --- | --- | --- |
| E7-US01 | As a Student, I want Writing image uploads to be validated and stored securely so that my submission assets are preserved correctly. | 5 |
| E7-US02 | As a Student, I want Speaking audio uploads to be validated and stored securely so that Teachers can grade my recording reliably. | 5 |
| E7-US03 | As the platform, I want media metadata and ownership to be tracked so that uploaded assets can be linked to the correct submission records. | 3 |
| E7-US04 | As an Engineer, I want failed media uploads to be retry-safe so that partial submission failures do not create broken references. | 5 |

---

## Technical Breakdown

### E7-US01: Writing image upload

- [ ] Define a `MediaAsset` schema with `ownerId`, `module`, `assetType`, `mimeType`, `fileSize`, `storageProvider`, `publicId`, `secureUrl`, `status`, `checksum`, `createdAt`, and `updatedAt`.
- [ ] Define validation rules for supported Writing image types, max size, and ownership binding.
- [ ] Implement `POST /api/media/upload/image` for authenticated image upload.
- [ ] Implement upload adapter logic for Cloudinary or the selected media provider.
- [ ] Persist metadata after successful upload and return a normalized media response.
- [ ] Add failure-safe cleanup when provider upload succeeds but metadata persistence fails.
- [ ] Integrate the Writing submission UI in the frontend base with image picker, progress state, and retry handling.

### E7-US02: Speaking audio upload

- [ ] Extend `MediaAsset` validation to support Speaking audio formats, duration-related constraints if needed, and max file size.
- [ ] Implement `POST /api/media/upload/audio` for authenticated audio upload.
- [ ] Store audio metadata and ownership references for later grading retrieval.
- [ ] Return playback-friendly secure URLs or provider references for downstream speaking-service use.
- [ ] Integrate the Speaking submission UI with audio selection, upload progress, and failure feedback.

### E7-US03: Media metadata tracking

- [ ] Implement `GET /api/media/:id` for internal retrieval of asset metadata.
- [ ] Implement `POST /api/media/link` or equivalent internal linkage endpoint if writing-service and speaking-service need explicit association updates.
- [ ] Define ownership and module tagging strategy for `writing`, `speaking`, and future modules.
- [ ] Add API contract documentation for how downstream services consume asset identifiers.
- [ ] Ensure metadata exposes only safe fields to clients.

### E7-US04: Retry-safe upload flow

- [ ] Design idempotency or duplicate-safe handling for repeated upload attempts.
- [ ] Add temporary upload status values such as `pending`, `uploaded`, `linked`, and `failed`.
- [ ] Implement safe retry behavior when frontend upload is repeated after timeout or network interruption.
- [ ] Add scheduled cleanup strategy for orphaned or failed uploads.
- [ ] Test partial failure cases between provider upload and database persistence.

---

## Shared Technical Tasks

### Database and Backend

- [ ] Finalize media schema indexes for owner, module, status, and creation time.
- [ ] Add authentication middleware integration so only authorized users upload assets.
- [ ] Add request logging and error mapping for provider failures.
- [ ] Add health endpoint and provider connectivity diagnostic checks.

### REST API Surface

- [ ] Finalize contracts for `POST /api/media/upload/image`, `POST /api/media/upload/audio`, `GET /api/media/:id`, and any internal asset-linking routes.
- [ ] Align response contracts with writing-service and speaking-service expectations.

### FE Integration into Sprint 0 Base

- [ ] Create shared upload client helpers in the frontend API layer.
- [ ] Create reusable image upload and audio upload components based on Sprint 0 UI primitives.
- [ ] Add standardized progress, error, retry, and success states for uploads.
- [ ] Confirm uploaded asset IDs can be passed into Writing and Speaking forms for later sprints.

### Integration and Testing

- [ ] Test valid and invalid image uploads.
- [ ] Test valid and invalid audio uploads.
- [ ] Test unauthorized upload attempts.
- [ ] Test retry behavior under simulated network interruption.
- [ ] Record asset contract assumptions for Sprint 3 and Sprint 4 service integrations.

---

## Definition of Done for Sprint 2

- Image and audio uploads work end-to-end.
- Media metadata is persisted and retrievable.
- Upload retries do not create broken or duplicate references without policy control.
- Frontend upload components are reusable in later Writing and Speaking sprints.
