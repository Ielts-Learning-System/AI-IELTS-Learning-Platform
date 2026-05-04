# IELTS Preparation Platform

## Initial Requirements Document (PRD) and Architecture Outline

Document status: Draft v1.0  
Prepared on: 2026-03-24  
Product scope: IELTS Preparation Platform with microservices-based backend and React frontend

---

## 1. Product Vision

Build a scalable IELTS preparation platform that helps learners practice Reading, Listening, Writing, and Speaking in one place, combining instant automated scoring for objective modules with teacher-led evaluation for productive skills, while supporting premium learning access through a controlled VIP subscription workflow.

The platform should enable students to practice efficiently, teachers to grade consistently using IELTS band descriptors, and admins to operate payments, content, and access control with clear auditability.

---

## 2. Product Goals

### Business Goals

- Launch a complete IELTS practice ecosystem for self-study and guided evaluation.
- Convert free users into paid VIP learners through premium plans.
- Provide a controlled manual payment model first, with future automation readiness.
- Create a service architecture that can scale feature-by-feature without tightly coupling business domains.

### Product Goals

- Deliver automated grading for Reading and Listening.
- Deliver teacher-based grading for Writing and Speaking.
- Support media upload flows for Writing image attachments and Speaking audio submissions.
- Provide a secure VIP activation flow based on VietQR and manual admin approval.
- Provide in-app notifications for grading completion and operational updates.

### Success Indicators

- Monthly Active Users supported at initial target of 5,000.
- Peak concurrency supported at 1,000 active users.
- Reading and Listening scoring delivered immediately after submission.
- Writing and Speaking grading completed within 48 hours, with an internal target of 24 hours where staffing allows.
- VIP activation completed only after verified admin approval.

---

## 3. Scope Summary

### In Scope for Initial Release

- User authentication and role-based access control.
- Guest browsing and student registration/login.
- Reading and Listening practice and auto-grading.
- Writing submission with image upload support.
- Speaking submission with audio upload support.
- Teacher dashboards for grading Writing and Speaking.
- Admin dashboard for manual VietQR payment verification and VIP activation.
- In-app notifications for grading completion and selected account actions.
- API Gateway-based microservices routing.
- MongoDB-backed domain services.

### Out of Scope for Initial Release

- Fully automated payment confirmation from PayOS, Momo, or bank webhook reconciliation.
- Real-time live classes or video conferencing.
- SMS and email notification channels.
- AI scoring for Writing and Speaking as a decisioning source.
- Native mobile applications.

### Planned Extension Areas

- PayOS integration for semi-automated or automated payment confirmation.
- Notification expansion to email, Telegram, or push channels.
- Enhanced analytics and recommendation engine.
- Content management tooling for lesson and billing packages.

---

## 4. Assumptions

- Peak simultaneous test submissions were not explicitly quantified; for planning, the system should be designed to tolerate at least 100 near-simultaneous submissions during peak windows and be load-tested before production launch.
- Manual grading is performed by Teachers only; Admins supervise operations but are not primary graders.
- IELTS official-style band descriptors are used as the grading rubric baseline for Writing and Speaking.
- In-app notifications are the only mandatory channel in the first release.
- VIP plans at launch include Plus and Pro, each with a 1-year subscription term.

---

## 5. User Roles

| Role | Description | Core Permissions |
| --- | --- | --- |
| Guest | Unauthenticated visitor | Browse landing pages, view selected public information, register, log in |
| Student | Registered free learner | Access free content, take eligible tests, submit Writing/Speaking tasks, view own results |
| VIP Student | Paid learner with approved package | Access premium content, premium tests, enhanced learning assets, VIP-only modules |
| Teacher | Human evaluator for productive skills | View assigned submissions, grade Writing/Speaking, provide band scores and feedback |
| Admin | Platform operator | Manage users, approve VIP payments, activate subscriptions, oversee content and operations |

---

## 6. Core Product Capabilities

### Learning and Assessment

- Reading tests with automated grading.
- Listening tests with automated grading.
- Writing task submission with optional image attachment.
- Speaking task submission with audio upload.
- Score history and submission tracking.

### Subscription and Monetization

- Package selection for Plus and Pro yearly plans.
- VietQR payment instructions display.
- Student payment declaration via "I have paid" action.
- Admin-side manual verification and activation.

### Teaching and Operations

- Teacher grading workspace for Writing and Speaking.
- Admin operational dashboard for payment and platform control.
- In-app notification delivery for result-ready and workflow status changes.

---

## 7. Epic List Mapped to Microservices

| Epic ID | Epic Name | Description | Primary Services |
| --- | --- | --- | --- |
| E1 | Identity and Access Management | Registration, login, JWT, RBAC, role enforcement | auth-service, api-gateway |
| E2 | Student Assessment Experience | Reading and Listening practice, question delivery, submissions, auto-scoring | reading-service, listening-service, api-gateway |
| E3 | Writing Assessment Workflow | Writing prompt delivery, answer submission, attachment upload, teacher grading | writing-service, cloud-media-service, api-gateway |
| E4 | Speaking Assessment Workflow | Speaking prompt delivery, audio upload, teacher grading | speaking-service, cloud-media-service, api-gateway |
| E5 | VIP Subscription and Payment Operations | Package display, VietQR flow, payment declaration, admin approval, VIP activation | payment-service, auth-service, api-gateway |
| E6 | Notification and Status Updates | In-app notifications for grading complete, payment approved, system actions | notification-service, api-gateway |
| E7 | Media Management | Secure upload and retrieval of image and audio assets | cloud-media-service, api-gateway |
| E8 | Content and Commercial Support | Lesson and billing package support, future extensibility | lesson-service, billing-service |
| E9 | Platform Administration and Observability | User oversight, audit traceability, system operations | auth-service, payment-service, notification-service, api-gateway |

---

## 8. User Stories with Acceptance Criteria

### 8.1 Authentication and Access

#### US-01: Student Registration

As a Guest, I want to create an account so that I can access IELTS practice features.

Acceptance Criteria:

- Given I am a Guest, when I submit valid registration information, then a Student account is created.
- Given the email or username already exists, when I submit the form, then the system rejects the registration with a clear validation message.
- Given registration is successful, when I log in, then I receive access according to the Student role.

#### US-02: Role-Based Access

As an Admin, I want the system to enforce role permissions so that each user only sees functions allowed for their role.

Acceptance Criteria:

- Given a Student is authenticated, when the Student accesses Teacher-only or Admin-only routes, then access is denied.
- Given a VIP Student is authenticated, when the user accesses VIP content, then access is granted only if the subscription is active.
- Given a Teacher is authenticated, when the Teacher opens grading screens, then only grading-related functions are available.

### 8.2 Reading and Listening Test Submission

#### US-03: Reading Auto-Grading

As a Student, I want to submit a Reading test and receive an immediate result so that I can quickly understand my performance.

Acceptance Criteria:

- Given I have completed a Reading test, when I submit my answers, then the system stores the submission and calculates the score automatically.
- Given the submission is valid, when scoring completes, then I can view my score, correct answers, and relevant result details.
- Given a temporary backend error occurs, when I submit, then the system returns a recoverable error message and does not lose my answer payload silently.

#### US-04: Listening Auto-Grading

As a Student, I want to submit a Listening test and receive an immediate result so that I can review mistakes without waiting for a human grader.

Acceptance Criteria:

- Given I have answered a Listening test, when I submit, then the system validates and grades the submission automatically.
- Given normalization rules apply to acceptable answers, when scoring is processed, then the evaluation uses the configured normalization logic consistently.
- Given grading completes, when I open the result, then I can see score details and submission history.

### 8.3 Writing Submission and Grading

#### US-05: Writing Submission with Attachment

As a Student, I want to submit a Writing response with optional image attachments so that I can complete writing tasks that require supporting visuals or handwritten content.

Acceptance Criteria:

- Given I am on a Writing task, when I upload supported image files and submit my response, then the system stores the answer and associated media references.
- Given the file type or size is invalid, when I attempt upload, then the system rejects it with a validation message.
- Given submission succeeds, when the task is saved, then its status becomes Pending Grading.

#### US-06: Teacher Grades Writing

As a Teacher, I want to grade Writing submissions using IELTS band descriptors so that students receive standardized feedback.

Acceptance Criteria:

- Given a Writing submission is pending, when I open it, then I can view the prompt, student answer, and any uploaded attachments.
- Given I enter criterion scores and comments, when I submit the grade, then the system stores the band evaluation and marks the submission as Graded.
- Given grading is completed, when the record is updated, then the student receives an in-app notification.
- Given the SLA policy applies, when a submission remains ungraded beyond 48 hours, then it is visible in overdue operational views.

### 8.4 Speaking Submission and Grading

#### US-07: Speaking Audio Submission

As a Student, I want to upload my Speaking response as audio so that a Teacher can evaluate my speaking performance.

Acceptance Criteria:

- Given I am completing a Speaking task, when I upload a supported audio file and submit, then the system stores the media asset and submission metadata.
- Given the upload fails, when the submission is not fully stored, then the system informs me and prevents false success confirmation.
- Given submission succeeds, when the task is saved, then its status becomes Pending Grading.

#### US-08: Teacher Grades Speaking

As a Teacher, I want to listen to student audio and assign IELTS band-based feedback so that the learner receives actionable speaking evaluation.

Acceptance Criteria:

- Given a Speaking submission is pending, when I open it, then I can play the submitted audio and view the task context.
- Given I complete the scoring rubric and comments, when I save the result, then the submission status changes to Graded.
- Given grading is completed, when the result is published, then the student receives an in-app notification.

### 8.5 VIP Payment and Activation

#### US-09: Student Declares VietQR Payment

As a Student, I want to select a VIP package, pay using VietQR, and notify the system that I have paid so that my subscription can be reviewed for activation.

Acceptance Criteria:

- Given I choose a Plus or Pro package, when I open the payment screen, then the system displays package details, pricing, and the QR payment instructions.
- Given I have transferred the payment, when I click "I have paid", then the system creates a payment request with status Pending Approval.
- Given I have already created a pending request for the same package, when I repeat the action, then the system prevents duplicate active pending requests or handles them according to policy.

#### US-10: Admin Approves VIP Payment

As an Admin, I want to verify student payment declarations and activate VIP access only after confirmation so that premium access is controlled and auditable.

Acceptance Criteria:

- Given a payment request is pending, when I review it in the admin dashboard, then I can see the student, package, request time, and payment status.
- Given I confirm receipt of the transfer, when I approve the request, then the student's account is upgraded to the correct VIP entitlement and subscription period.
- Given I reject or cannot verify the transfer, when I update the request, then the status changes accordingly and the student is notified in-app.
- Given approval is manual-only in the first release, when a payment is created, then no automatic VIP activation occurs before admin action.

### 8.6 Notifications

#### US-11: In-App Result Notification

As a Student, I want to receive an in-app notification when grading is complete so that I know when my results are ready.

Acceptance Criteria:

- Given a Teacher grades my Writing or Speaking submission, when the result is finalized, then an in-app notification is created for my account.
- Given I open the notification center, when unread items exist, then I can see the latest grading-related updates.
- Given I view a notification, when it is opened, then its read state is updated.

---

## 9. Critical Business Flows

### 9.1 Payment Approval Flow

1. Student selects Plus or Pro yearly VIP package.
2. System displays VietQR payment instructions.
3. Student completes bank transfer externally.
4. Student clicks "I have paid".
5. System creates a pending payment request.
6. Admin reviews pending payment requests.
7. Admin approves or rejects the payment.
8. On approval, system activates VIP access and creates an in-app notification.

### 9.2 Auto-Graded Test Flow

1. Student starts a Reading or Listening test.
2. Student submits answers.
3. Relevant service validates answers and scoring rules.
4. System stores submission and result.
5. Student receives immediate result view.

### 9.3 Manual Grading Flow

1. Student submits Writing or Speaking task.
2. System stores submission and media references.
3. Submission enters Pending Grading queue.
4. Teacher reviews and grades using IELTS descriptors.
5. System publishes result and updates submission status.
6. Student receives in-app notification that grading is complete.

---

## 10. Non-Functional Requirements (NFRs)

### 10.1 Performance

- The platform shall support at least 1,000 peak concurrent users.
- The platform shall support at least 5,000 monthly active users in the initial operating phase.
- API read requests through the API Gateway should achieve p95 response time of less than 300 ms under normal load, excluding media upload/download and external service latency.
- Reading and Listening auto-grading results should be returned within 5 seconds for 95 percent of submissions under normal peak load.
- Writing and Speaking submission creation endpoints should acknowledge successful request persistence within 2 seconds for 95 percent of non-media operations.
- Media upload operations should support resumable or retry-safe handling at the application level where feasible.

### 10.2 Security

- All protected APIs shall require JWT-based authentication.
- All service access shall enforce role-based authorization for Guest, Student, VIP Student, Teacher, and Admin.
- Passwords shall be hashed using a strong one-way hashing mechanism such as bcrypt.
- Media assets shall not be exposed through insecure public paths unless explicitly intended; uploaded student data should use controlled access or signed retrieval where appropriate.
- Administrative actions such as payment approval, rejection, and role changes shall be auditable.
- Input validation shall be enforced at gateway and service levels for payloads, file types, and media sizes.

### 10.3 Scalability

- Each microservice shall be independently deployable and horizontally scalable where stateless behavior permits.
- The system should support asynchronous event-driven extension using RabbitMQ for notifications, workflow decoupling, and future background jobs.
- Redis may be used for caching, session-related optimization, throttling, or ephemeral workflow state where beneficial.
- Services must own their domain logic and data boundaries to reduce cross-service coupling.

### 10.4 Availability and Reliability

- The system availability target for the first production release shall be 99.5 percent monthly uptime.
- A failed downstream service should degrade gracefully where possible without causing full platform outage.
- Submission workflows must avoid silent data loss; failure responses should be explicit and traceable.
- Critical business records including payments, submissions, grades, and subscription activations must be durably persisted.
- Observability should include centralized logging, request tracing identifiers, and service health checks.

### 10.5 Maintainability

- Service contracts should be versioned and documented.
- Domain logic should remain in the owning service rather than duplicated in the gateway.
- Shared libraries should be limited to cross-cutting concerns such as auth middleware, logging contracts, and event schemas.
- The architecture should allow introduction of automated payment integrations later without breaking existing manual payment workflows.

---

## 11. Constraints

### Technical Constraints

- Frontend is implemented in React-based architecture and must consume backend services through the API Gateway.
- Backend is structured as Node.js microservices, with Python components already present in selected services for future processing support.
- MongoDB is the primary persistence model assumed for domain services.
- Cloudinary or equivalent cloud media storage is required for Writing image uploads and Speaking audio uploads.
- Initial deployment is containerized via Docker Compose, which is suitable for development and limited initial operations but not a full production orchestration strategy.

### Business Constraints

- Payment approval is fully manual in the initial release.
- VIP access must never be granted before Admin approval.
- Grading for Writing and Speaking is performed by Teachers only.
- Writing and Speaking evaluations must align with IELTS band descriptors.
- Launch package catalog is limited to Plus and Pro yearly plans.

### Operational Constraints

- In-app notifications are the only mandatory notification channel in phase 1.
- Teacher availability directly affects grading turnaround time.
- Admin operations are required to complete VIP conversion, which introduces a manual dependency and business-hours sensitivity.
- Peak simultaneous submission capacity must be validated with load testing because actual production behavior may exceed current assumptions.

---

## 12. Architecture Outline

### 12.1 Architectural Style

The system follows a microservices architecture with an API Gateway as the single frontend entry point. Each business domain is isolated into a dedicated service responsible for its own business rules and persistence boundaries.

This architecture is appropriate because it:

- Separates assessment, media, identity, payment, and notification concerns.
- Allows independent development and deployment by service.
- Supports future asynchronous workflows and external integrations.
- Reduces the risk of a single monolithic codebase becoming a delivery bottleneck.

### 12.2 High-Level Component View

| Layer | Component | Responsibility |
| --- | --- | --- |
| Client Layer | React frontend | Student, Teacher, and Admin user experience |
| Edge Layer | API Gateway | Routing, auth propagation, request validation, cross-service entry point |
| Identity Layer | auth-service | Authentication, authorization, role and account state |
| Assessment Layer | reading-service | Reading question delivery, submissions, auto-grading |
| Assessment Layer | listening-service | Listening delivery, submissions, auto-grading |
| Assessment Layer | writing-service | Writing prompts, submissions, grading state, feedback storage |
| Assessment Layer | speaking-service | Speaking prompts, audio submission metadata, grading state |
| Media Layer | cloud-media-service | Upload orchestration and media asset management |
| Commerce Layer | payment-service | VIP package payment requests, manual approval workflow, activation trigger |
| Notification Layer | notification-service | In-app notification creation and delivery |
| Support Layer | billing-service | Commercial catalog support and future monetization logic |
| Support Layer | lesson-service | Learning content support and curriculum extensions |
| Infra Layer | MongoDB | Persistent domain data storage |
| Infra Layer | Redis | Cache and transient performance optimization |
| Infra Layer | RabbitMQ | Async communication and decoupled events |

### 12.3 Recommended Service Responsibilities

#### API Gateway

- Single entry point for frontend applications.
- Verifies tokens or delegates token verification consistently.
- Routes requests to downstream domain services.
- Applies cross-cutting concerns such as rate limits, request logging, and correlation IDs.

#### auth-service

- User registration and login.
- Role assignment and account state management.
- VIP entitlement state as consumed by authorization checks or shared user profile logic.

#### reading-service

- Reading content retrieval.
- Answer submission and automated scoring.
- Storage of historical scores and attempt metadata.

#### listening-service

- Listening content retrieval.
- Answer submission and automated scoring.
- Support for normalization logic and result history.

#### writing-service

- Writing task definitions.
- Submission lifecycle tracking.
- Teacher grading records, rubric scores, and feedback comments.

#### speaking-service

- Speaking task definitions.
- Audio submission metadata and grading lifecycle.
- Teacher scoring and feedback persistence.

#### cloud-media-service

- Handles secure upload workflows for image and audio files.
- Stores asset references for writing and speaking submissions.
- Enforces media validation rules.

#### payment-service

- Maintains payment request state machine such as Pending Approval, Approved, and Rejected.
- Stores selected plan and approval metadata.
- Triggers VIP activation workflow after admin confirmation.
- Preserves compatibility with future PayOS integration.

#### notification-service

- Creates in-app notifications for grading completion, payment approval, payment rejection, and administrative alerts.
- May consume asynchronous events from grading and payment services.

### 12.4 Suggested Domain Events

| Event | Producer | Consumer |
| --- | --- | --- |
| PaymentDeclared | payment-service | notification-service, admin dashboard workflows |
| PaymentApproved | payment-service | auth-service, notification-service |
| PaymentRejected | payment-service | notification-service |
| WritingSubmitted | writing-service | teacher work queue, notification-service optional |
| SpeakingSubmitted | speaking-service | teacher work queue, notification-service optional |
| SubmissionGraded | writing-service or speaking-service | notification-service |

### 12.5 Data Ownership Principles

- auth-service owns user identity, credentials, roles, and subscription status.
- payment-service owns payment request records and approval history.
- reading-service and listening-service own objective test content, attempts, and scores.
- writing-service and speaking-service own productive task submissions, grading records, and result state.
- cloud-media-service owns media metadata and storage integration concerns.
- notification-service owns notification records and read/unread state.

### 12.6 Key API and Workflow Principles

- The frontend should not call microservices directly; all traffic should flow through the API Gateway.
- The gateway should remain thin and avoid embedding domain business logic.
- Long-running and cross-service actions should move toward event-driven processing.
- Submission endpoints should be idempotent or duplicate-safe where business-critical actions can be retried.
- Payment approval should produce an auditable state transition with actor, time, and target subscription details.

### 12.7 Deployment Considerations

- Current Docker Compose setup is suitable for local development, integration testing, and limited non-critical deployment.
- A production evolution path should include container orchestration, centralized secrets management, managed database operations, and externalized observability.
- Media-heavy workloads should be offloaded to cloud storage and CDN-friendly delivery patterns.
- Notification processing should be asynchronous to avoid delaying user-facing grading and payment operations.

---

## 13. Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Manual payment approval becomes operational bottleneck | Delayed VIP activation | Provide admin queue views, timestamps, and notification support; automate later with PayOS |
| Teacher grading volume exceeds capacity | SLA breach for Writing and Speaking | Add queue monitoring, overdue dashboard, and teacher assignment controls |
| Media upload instability affects submissions | Lost or partial Speaking/Writing records | Use upload validation, transactional submission finalization, and retry-safe upload flow |
| Gateway or auth dependency failure affects all services | Wide platform disruption | Add health checks, fallback handling, and service-level monitoring |
| Cross-service data drift for VIP status | Incorrect access control | Make auth-service the source of truth for active entitlements and log all subscription transitions |

---

## 14. Release Recommendations

### Phase 1

- Auth, RBAC, Reading, Listening, Writing, Speaking, Media, Payment, Admin approval, and in-app notifications.

### Phase 2

- PayOS integration.
- Event-driven notification pipeline.
- Better analytics, dashboards, and operational reporting.

### Phase 3

- Recommendation engine.
- Deeper content services.
- Partial automation for payment reconciliation and grading assistance.

---

## 15. Open Decisions for Next Revision

- Exact target for simultaneous peak test submissions.
- Pricing and access differences between Plus and Pro.
- Teacher assignment model: pooled queue or manual assignment.
- Whether Admin can override grades or only manage workflow.
- Whether notification read models should be real-time or refreshed on demand.

---

## 16. Summary

This initial PRD and architecture outline defines a practical first-release IELTS platform centered on four exam skills, teacher-led grading for subjective modules, manual VIP payment verification, and a microservices foundation that supports future automation and scale. The immediate architecture should prioritize clear domain boundaries, reliable submission workflows, auditable payment approval, and operational visibility for grading and subscription management.