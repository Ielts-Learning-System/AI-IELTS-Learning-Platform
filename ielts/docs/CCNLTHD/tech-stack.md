# IELTS Learning Platform — Technology Stack

> **Architecture**: Microservices · Database-per-Service  
> **Document Status**: v1.0 · May 2026

---

## Table of Contents

1. [Frontend](#1-frontend)
2. [Backend / Microservices](#2-backend--microservices)
3. [Databases & Cache](#3-databases--cache)
4. [Messaging & Real-time](#4-messaging--real-time)
5. [AI & Machine Learning](#5-ai--machine-learning)
6. [Infrastructure & DevOps](#6-infrastructure--devops)

---

## 1. Frontend

| Technology | Badge | Architectural Justification |
|:-----------|:-----:|:-----------------------------|
| **React 19** | ![React](https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB) | Selected as the UI library to build three distinct role-based SPAs (Admin, Teacher, Student) from a single codebase. Its component model cleanly maps to the platform's complex, stateful views such as the real-time exam timer, interactive answer panels, and teacher grading rubric forms. |
| **TypeScript 5** | ![TypeScript](https://img.shields.io/badge/TypeScript_5-3178C6?style=flat-square&logo=typescript&logoColor=white) | Enforces compile-time type contracts across all client-side modules, preventing a class of runtime bugs that are particularly costly in the exam submission and grading flows where data-shape mismatches would corrupt student scores. |
| **Vite 6** | ![Vite](https://img.shields.io/badge/Vite_6-646CFF?style=flat-square&logo=vite&logoColor=white) | Used as the build tool and development server for its sub-second HMR, enabling rapid iteration on the IELTS UI components. Its native ES module architecture produces optimally tree-shaken production bundles for the reading/listening passage player components. |
| **Tailwind CSS 4** | ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white) | Provides the utility-first design system used throughout all three dashboards. Its JIT compilation ensures that only the CSS classes actually rendered in the final UI are shipped, keeping stylesheet payloads minimal for learners on mobile bandwidth. |
| **React Router DOM 7** | ![React Router](https://img.shields.io/badge/React_Router_7-CA4245?style=flat-square&logo=reactrouter&logoColor=white) | Handles client-side routing for the SPA, including protected routes that enforce role-based access (e.g., `/teacher/grade` is inaccessible to Student role) without a full page reload, preserving in-flight exam state. |
| **Zustand 5** | ![Zustand](https://img.shields.io/badge/Zustand_5-FF6B35?style=flat-square&logo=npm&logoColor=white) | Chosen as the global state manager for its minimal boilerplate and out-of-the-box subscription model, which is ideal for sharing exam session state (timer, current question index, answer buffer) across deeply nested components without prop-drilling. |
| **Socket.io Client 4** | ![Socket.io](https://img.shields.io/badge/Socket.io_Client-010101?style=flat-square&logo=socketdotio&logoColor=white) | Provides the client-side WebSocket connection to the `notification-service`, enabling the platform to push instant grading-complete alerts and VIP activation confirmations directly to the browser — eliminating the latency and resource cost of polling. |
| **Axios** | ![Axios](https://img.shields.io/badge/Axios-5A29E4?style=flat-square&logo=axios&logoColor=white) | Serves as the HTTP client for all REST calls to the API Gateway. Its interceptor API is used to attach JWT tokens to every outbound request and to handle 401 responses by redirecting to the login page, centralising authentication concerns. |
| **Tiptap 3** | ![Tiptap](https://img.shields.io/badge/Tiptap-000000?style=flat-square&logo=npm&logoColor=white) | Integrated as the rich-text editor for the Writing practice module, providing students with a WYSIWYG environment that mirrors the styled text input expected in the real IELTS computer-based test. |
| **Recharts 3** | ![Recharts](https://img.shields.io/badge/Recharts-22B5BF?style=flat-square&logo=npm&logoColor=white) | Powers the analytics dashboards (band score history, skill breakdown radar charts) for students and teachers. Its declarative, React-native API integrates seamlessly with Zustand state without requiring a separate charting context. |
| **React Hook Form + Zod** | ![RHF](https://img.shields.io/badge/React_Hook_Form_+_Zod-EC5990?style=flat-square&logo=reacthookform&logoColor=white) | Handles all form validation (registration, login, payment submission). Zod schemas are shared between the frontend and the API contracts, ensuring that invalid data is rejected at the UI boundary before ever reaching the API Gateway. |

---

## 2. Backend / Microservices

| Technology | Badge | Architectural Justification |
|:-----------|:-----:|:-----------------------------|
| **Node.js** | ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white) | Selected as the runtime for all 11 JavaScript microservices. Its single-threaded, event-loop architecture efficiently handles the high I/O concurrency (simultaneous submission events from multiple students during peak test windows) without the overhead of thread-per-request models. |
| **Express.js** | ![Express](https://img.shields.io/badge/Express.js-000000?style=flat-square&logo=express&logoColor=white) | Provides the minimal, composable HTTP server layer for each microservice. Its middleware model maps cleanly to the cross-cutting concerns (JWT verification, request validation, error handling) that each service must apply independently in a Database-per-Service architecture. |
| **Python 3** | ![Python](https://img.shields.io/badge/Python_3-3776AB?style=flat-square&logo=python&logoColor=white) | Used exclusively for the `ai-service`, leveraging the Python AI/ML ecosystem — particularly the `google-genai` and `pypdf` libraries — which have no equivalent depth in the Node.js world for production-grade LLM integration and PDF document parsing. |
| **FastAPI** | ![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white) | Chosen for the `ai-service` due to its native `async/await` support enabling non-blocking Gemini API calls, automatic OpenAPI schema generation for contract documentation, and the highest throughput among Python ASGI frameworks — critical when processing large Writing PDF payloads concurrently. |
| **Uvicorn** | ![Uvicorn](https://img.shields.io/badge/Uvicorn-499848?style=flat-square&logo=gunicorn&logoColor=white) | Serves as the production-grade ASGI server for FastAPI, providing the high-performance event loop (based on `uvloop`) necessary to handle multiple concurrent grading requests without blocking the `ai-service` process. |
| **Pydantic 2** | ![Pydantic](https://img.shields.io/badge/Pydantic_2-E92063?style=flat-square&logo=pydantic&logoColor=white) | Enforces strict input/output data validation on all `ai-service` endpoints via Python type hints, ensuring that malformed grading requests (e.g., missing band-score fields) are rejected with structured error responses before reaching the Gemini API call. |
| **JWT (jsonwebtoken)** | ![JWT](https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white) | Implements stateless authentication across the entire service mesh. The API Gateway validates tokens against Redis-cached public keys before proxying, eliminating repeated roundtrips to `auth-service` and enabling each downstream service to operate without holding session state. |
| **Mongoose** | ![Mongoose](https://img.shields.io/badge/Mongoose-880000?style=flat-square&logo=mongoose&logoColor=white) | Acts as the ODM layer for every Node.js service, enforcing schema definitions (e.g., IELTS question structures, band-score rubrics) at the application level where MongoDB's schema-flexible design would otherwise allow data inconsistency. |
| **http-proxy-middleware** | ![npm](https://img.shields.io/badge/http--proxy--middleware-CB3837?style=flat-square&logo=npm&logoColor=white) | Powers the API Gateway's reverse-proxy routing. Critically, it is configured **without** body-parsing middleware upstream, passing raw request streams through to downstream services untouched — a requirement for binary media uploads (audio files for Speaking, images for Writing) to reach the `cloud-media-service` without stream corruption. |
| **amqplib** | ![RabbitMQ](https://img.shields.io/badge/amqplib-FF6600?style=flat-square&logo=rabbitmq&logoColor=white) | The AMQP 0-9-1 client used by every Node.js service to publish to and consume from RabbitMQ queues. Its callback-based API is wrapped in Promise adapters within each service, keeping event publishing non-blocking. |
| **httpx** | ![httpx](https://img.shields.io/badge/httpx-009688?style=flat-square&logo=python&logoColor=white) | Used within the `ai-service` as the async HTTP client for outbound calls to external APIs. Its full `async/await` support prevents the Gemini API I/O wait from blocking the FastAPI event loop during batch grading requests. |

---

## 3. Databases & Cache

| Technology | Badge | Architectural Justification |
|:-----------|:-----:|:-----------------------------|
| **MongoDB** | ![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white) | Deployed as **10 isolated databases** enforcing the Database-per-Service pattern. Its flexible document model naturally accommodates the heterogeneous data structures across domains: hierarchical reading passages with embedded question arrays, audio-segment metadata for listening tests, and rich IELTS rubric-annotated feedback objects for writing/speaking submissions — none of which map cleanly to a fixed relational schema. |
| **Redis** | ![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white) | Deployed at the API Gateway layer for two security-critical functions: (1) caching validated JWT signatures to eliminate repeated `auth-service` roundtrips on every proxied request, and (2) enforcing sliding-window rate limits on public endpoints (e.g., `/api/auth/login`) to mitigate brute-force credential attacks — aligned with OWASP API Security Top 10 (API4: Unrestricted Resource Consumption). |

---

## 4. Messaging & Real-time

| Technology | Badge | Architectural Justification |
|:-----------|:-----:|:-----------------------------|
| **RabbitMQ 3** | ![RabbitMQ](https://img.shields.io/badge/RabbitMQ_3-FF6600?style=flat-square&logo=rabbitmq&logoColor=white) | Selected as the message broker to achieve full domain decoupling for async workflows. When a student's Writing answer is graded, the `writing-service` publishes a `submission.graded` event; the `notification-service` independently consumes it to push a Socket.io alert. This guarantees that a notification infrastructure failure never rolls back or blocks the grading pipeline — a critical reliability boundary for a timed assessment platform. |
| **Socket.io 4** | ![Socket.io](https://img.shields.io/badge/Socket.io_4-010101?style=flat-square&logo=socketdotio&logoColor=white) | Embedded in the `notification-service` as the WebSocket transport for pushing real-time events to connected browser sessions. Its automatic fallback to HTTP long-polling ensures notification delivery even in restrictive network environments (e.g., school Wi-Fi with WebSocket filtering), maintaining the real-time UX promise for all students. |

---

## 5. AI & Machine Learning

| Technology | Badge | Architectural Justification |
|:-----------|:-----:|:-----------------------------|
| **Google Gemini API** | ![Google Gemini](https://img.shields.io/badge/Google_Gemini-8E75B2?style=flat-square&logo=googlegemini&logoColor=white) | Chosen as the core LLM for automated grading because of its multimodal capability — it can directly ingest PDF documents, eliminating the need for a separate OCR/extraction pipeline for IELTS question sheets uploaded by teachers. Its instruction-following quality is sufficient for structured IELTS band-score grading rubric compliance (Task Achievement, Coherence, Lexical Resource, Grammatical Range). |
| **google-genai SDK 0.8** | ![google-genai](https://img.shields.io/badge/google--genai_SDK-4285F4?style=flat-square&logo=google&logoColor=white) | The official Python SDK (`google-genai`) provides the async client, streaming response support, and built-in retry/backoff logic for the Gemini API. Using the official SDK over raw HTTP reduces the operational surface area for API contract changes and ensures forward-compatibility as Gemini model versions evolve. |
| **pypdf 5** | ![pypdf](https://img.shields.io/badge/pypdf_5-3776AB?style=flat-square&logo=python&logoColor=white) | Handles pre-processing of uploaded PDF question sheets within the `ai-service` before multimodal submission to Gemini. It provides page extraction and text layer parsing, enabling the service to selectively feed only relevant pages to the LLM — reducing token consumption and grading latency. |

---

## 6. Infrastructure & DevOps

| Technology | Badge | Architectural Justification |
|:-----------|:-----:|:-----------------------------|
| **Docker** | ![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white) | Every service is containerised in its own `Dockerfile` using language-appropriate base images (Node.js Alpine for JS services, Python Slim for `ai-service`). Container isolation enforces the service boundary discipline of the microservices architecture — a service cannot reach another service's files or runtime environment, only its network API. |
| **Docker Compose** | ![Docker Compose](https://img.shields.io/badge/Docker_Compose-2496ED?style=flat-square&logo=docker&logoColor=white) | Orchestrates the full 13-service stack (API Gateway, 10 microservices, RabbitMQ, Redis) as a single declarative manifest. Service discovery is resolved via Docker's internal DNS (service names like `auth-service` resolve to container IPs), allowing the API Gateway's environment variables to target services by name without hardcoded IP addresses. |
| **VietQR** | ![VietQR](https://img.shields.io/badge/VietQR-005BAC?style=flat-square&logo=visa&logoColor=white) | Integrated into the `payment-service` for the Vietnamese domestic payment market. It generates standardised QR codes encoding bank account, amount, and memo fields, allowing students to pay for VIP subscriptions via any Vietnamese mobile banking application. Admin staff verify transfers via the bank's statement and manually activate accounts — a pragmatic, low-integration approach for the initial release that avoids the webhook complexity of full PayOS automation. |
| **RabbitMQ Management UI** | ![RabbitMQ](https://img.shields.io/badge/RabbitMQ_UI-FF6600?style=flat-square&logo=rabbitmq&logoColor=white) | Exposed on port `15672` for operational monitoring of queue depths, consumer status, and dead-letter events. In the IELTS context this is critical for detecting grading backlog (e.g., a spike in `submission.graded` queue depth signals that the `notification-service` consumer is falling behind during a mock exam rush). |

---

## Stack Summary Matrix

| Category | Technologies |
|:---------|:------------|
| **Frontend** | React 19, TypeScript 5, Vite 6, Tailwind CSS 4, Zustand, React Router 7, Socket.io Client, Axios, Tiptap, Recharts, Zod |
| **Backend (JS)** | Node.js, Express.js, Mongoose, JWT, amqplib, http-proxy-middleware |
| **Backend (Python)** | Python 3, FastAPI, Uvicorn, Pydantic 2, httpx |
| **Databases** | MongoDB × 10 (Database-per-Service), Redis |
| **Messaging** | RabbitMQ 3 (AMQP), Socket.io 4 (WebSocket) |
| **AI / ML** | Google Gemini API, google-genai SDK, pypdf 5 |
| **Infrastructure** | Docker, Docker Compose, VietQR |
