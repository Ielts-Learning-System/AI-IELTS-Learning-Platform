# Product Backlog

Project: IELTS Preparation Platform  
Planning horizon: 11 sprints `Sprint 0 to Sprint 10`  
Estimation scale: Fibonacci story points `1, 2, 3, 5, 8`

## Prioritization Logic

- `P0`: Required to launch the MVP.
- `P1`: Important for operational completeness and user experience.
- `P2`: Useful after MVP stabilization or as stretch scope inside the same epic.

---

## Epic E0: Frontend Foundation and AI Workflow

| Priority | Story ID | User Story | Story Points |
| --- | --- | --- | --- |
| P0 | E0-US01 | As a Frontend Lead, I want to define the frontend architecture baseline so that all later service integrations follow a consistent and scalable structure. | 5 |
| P0 | E0-US02 | As a Frontend Developer, I want to initialize the frontend foundation with Next.js, Tailwind CSS, API client patterns, and state management conventions so that feature delivery starts from a production-ready base. | 8 |
| P0 | E0-US03 | As a Frontend Developer, I want to define app routing, layout shells, and protected route patterns so that Student, Teacher, and Admin experiences can be integrated consistently. | 5 |
| P0 | E0-US04 | As a Frontend Developer, I want to use Perplexity to research best practices for App Router, folder structure, caching, and API integration so that architecture decisions are evidence-based. | 3 |
| P0 | E0-US05 | As a Frontend Developer, I want to use Google AI Studio and Gemini to generate starter UI components and boilerplate safely so that delivery speed improves without losing architectural control. | 3 |
| P1 | E0-US06 | As a Product team, I want a reusable design system foundation so that new microservice screens can be delivered with visual consistency. | 5 |
| P1 | E0-US07 | As a QA-oriented team, I want shared frontend conventions for error states, loading states, and form behavior so that integrated features behave predictably across modules. | 3 |

---

## Epic E1: Identity and Access Management

| Priority | Story ID | User Story | Story Points |
| --- | --- | --- | --- |
| P0 | E1-US01 | As a Guest, I want to register an account so that I can access IELTS practice features. | 5 |
| P0 | E1-US02 | As a Student, I want to log in securely so that I can access my learning history and protected features. | 3 |
| P0 | E1-US03 | As an authenticated user, I want my session and profile to be loaded after login so that the UI can show the correct permissions and navigation. | 3 |
| P0 | E1-US04 | As an Admin, I want the system to enforce role-based access control so that Guest, Student, VIP Student, Teacher, and Admin users only access authorized features. | 5 |
| P1 | E1-US05 | As a VIP Student, I want my VIP entitlement status to be reflected in my profile so that I can access premium features only when my subscription is active. | 3 |
| P1 | E1-US06 | As an Admin, I want to activate or update user roles and account states so that operational access changes are controlled centrally. | 5 |

---

## Epic E2: Assessment Delivery and Auto-Grading

### Reading

| Priority | Story ID | User Story | Story Points |
| --- | --- | --- | --- |
| P0 | E2-US01 | As a Student, I want to browse available Reading tests so that I can choose an exercise appropriate to my level. | 3 |
| P0 | E2-US02 | As a Student, I want to take a Reading test and submit my answers so that I can receive an immediate score. | 8 |
| P0 | E2-US03 | As a Student, I want to review my Reading results and answer breakdown so that I can understand my mistakes. | 5 |
| P1 | E2-US04 | As a Student, I want to access my Reading attempt history so that I can track progress over time. | 3 |

### Listening

| Priority | Story ID | User Story | Story Points |
| --- | --- | --- | --- |
| P0 | E2-US05 | As a Student, I want to browse available Listening tests so that I can select a suitable listening practice session. | 3 |
| P0 | E2-US06 | As a Student, I want to submit Listening answers and receive an immediate score so that I can review my performance right away. | 8 |
| P0 | E2-US07 | As a Student, I want the system to normalize accepted answer variants so that correct answers are graded fairly. | 5 |
| P1 | E2-US08 | As a Student, I want to review Listening attempt history so that I can measure improvement. | 3 |

---

## Epic E3: Writing Assessment Workflow

| Priority | Story ID | User Story | Story Points |
| --- | --- | --- | --- |
| P0 | E3-US01 | As a Student, I want to view Writing tasks so that I can choose and complete a writing exercise. | 3 |
| P0 | E3-US02 | As a Student, I want to submit a Writing response with optional image attachments so that I can complete tasks requiring text and supporting visuals. | 8 |
| P0 | E3-US03 | As a Teacher, I want to see pending Writing submissions so that I can grade them in order. | 5 |
| P0 | E3-US04 | As a Teacher, I want to evaluate Writing submissions using IELTS band descriptors so that students receive standardized scores and feedback. | 8 |
| P1 | E3-US05 | As a Student, I want to view my Writing results and feedback so that I can improve future submissions. | 3 |
| P1 | E3-US06 | As an Admin, I want overdue Writing submissions to be visible operationally so that grading SLA breaches can be monitored. | 3 |

---

## Epic E4: Speaking Assessment Workflow

| Priority | Story ID | User Story | Story Points |
| --- | --- | --- | --- |
| P0 | E4-US01 | As a Student, I want to view Speaking tasks so that I can attempt speaking practice tests. | 3 |
| P0 | E4-US02 | As a Student, I want to upload and submit my Speaking audio response so that a Teacher can assess my performance. | 8 |
| P0 | E4-US03 | As a Teacher, I want to see pending Speaking submissions so that I can manage my grading queue. | 5 |
| P0 | E4-US04 | As a Teacher, I want to assign IELTS descriptor-based Speaking scores and comments so that learners receive structured feedback. | 8 |
| P1 | E4-US05 | As a Student, I want to review my Speaking results and feedback so that I can improve fluency and accuracy. | 3 |

---

## Epic E5: VIP Subscription and Payment Operations

| Priority | Story ID | User Story | Story Points |
| --- | --- | --- | --- |
| P0 | E5-US01 | As a Student, I want to view available Plus and Pro yearly plans so that I can choose the VIP package that fits my needs. | 3 |
| P0 | E5-US02 | As a Student, I want to see VietQR payment instructions for my selected package so that I can transfer the correct amount. | 3 |
| P0 | E5-US03 | As a Student, I want to click "I have paid" after making a transfer so that my payment enters the admin review queue. | 5 |
| P0 | E5-US04 | As an Admin, I want to review pending payment declarations so that I can approve or reject them manually. | 5 |
| P0 | E5-US05 | As an Admin, I want VIP access to be activated only after approval so that premium access remains controlled and auditable. | 5 |
| P1 | E5-US06 | As a Student, I want to see the current payment request status so that I know whether my VIP access is pending, approved, or rejected. | 3 |
| P2 | E5-US07 | As a Product team, I want payment workflows to remain compatible with future PayOS integration so that automation can be added later without reworking the domain model. | 3 |

---

## Epic E6: Notification and Status Updates

| Priority | Story ID | User Story | Story Points |
| --- | --- | --- | --- |
| P1 | E6-US01 | As a Student, I want an in-app notification when my Writing or Speaking grading is complete so that I know when results are ready. | 3 |
| P1 | E6-US02 | As a Student, I want an in-app notification when my VIP payment is approved or rejected so that I understand my account status. | 3 |
| P1 | E6-US03 | As a Student, I want to view unread and read notifications in one place so that I can track important updates. | 3 |
| P2 | E6-US04 | As an Admin, I want notification events to be generated asynchronously so that grading and payment flows are not blocked by delivery concerns. | 5 |

---

## Epic E7: Media Management

| Priority | Story ID | User Story | Story Points |
| --- | --- | --- | --- |
| P0 | E7-US01 | As a Student, I want Writing image uploads to be validated and stored securely so that my submission assets are preserved correctly. | 5 |
| P0 | E7-US02 | As a Student, I want Speaking audio uploads to be validated and stored securely so that Teachers can grade my recording reliably. | 5 |
| P1 | E7-US03 | As the platform, I want media metadata and ownership to be tracked so that uploaded assets can be linked to the correct submission records. | 3 |
| P1 | E7-US04 | As an Engineer, I want failed media uploads to be retry-safe so that partial submission failures do not create broken references. | 5 |

---

## Epic E8: Content and Commercial Support

### Billing and Plan Catalog

| Priority | Story ID | User Story | Story Points |
| --- | --- | --- | --- |
| P1 | E8-US01 | As an Admin, I want to manage the Plus and Pro plan catalog so that package definitions remain configurable. | 3 |
| P1 | E8-US02 | As the payment workflow, I want package data to be sourced from a billing domain so that pricing logic is centralized. | 3 |

### Lesson and Learning Content Support

| Priority | Story ID | User Story | Story Points |
| --- | --- | --- | --- |
| P2 | E8-US03 | As a Student, I want lesson content to be organized by module so that I can navigate supporting learning materials efficiently. | 3 |
| P2 | E8-US04 | As an Admin, I want learning content services to be extensible so that future curriculum features can be introduced without reworking exam services. | 2 |

---

## Epic E9: Platform Administration and Observability

| Priority | Story ID | User Story | Story Points |
| --- | --- | --- | --- |
| P1 | E9-US01 | As an Admin, I want operational dashboards for payment and grading queues so that I can detect bottlenecks quickly. | 5 |
| P1 | E9-US02 | As an Engineer, I want service health checks and structured logs so that failures can be diagnosed quickly. | 3 |
| P1 | E9-US03 | As an Admin, I want auditable records for approvals, role changes, and subscription activation so that sensitive actions can be traced. | 5 |

---

## Backlog Ordering Recommendation

1. Epic E0: Frontend Foundation and AI Workflow
2. Epic E1: Identity and Access Management
3. Epic E7: Media Management
4. Epic E2: Assessment Delivery and Auto-Grading
5. Epic E3: Writing Assessment Workflow
6. Epic E4: Speaking Assessment Workflow
7. Epic E8: Billing and Commercial Support
8. Epic E5: VIP Subscription and Payment Operations
9. Epic E6: Notification and Status Updates
10. Epic E9: Platform Administration and Observability
