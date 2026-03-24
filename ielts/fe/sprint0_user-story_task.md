# Sprint 0: Frontend Foundation

Sprint goal: Establish the frontend base architecture, UI foundations, integration patterns, and AI-assisted workflow so all backend service sprints can plug into a stable frontend platform.

Note: The current repository already contains a React and Vite frontend. Sprint 0 should either migrate this base to the agreed Next.js architecture or formally confirm a Vite-based exception while still delivering the same architectural outputs below.

---

## User Stories in Scope

| Story ID | User Story | Story Points |
| --- | --- | --- |
| E0-US01 | As a Frontend Lead, I want to define the frontend architecture baseline so that all later service integrations follow a consistent and scalable structure. | 5 |
| E0-US02 | As a Frontend Developer, I want to initialize the frontend foundation with Next.js, Tailwind CSS, API client patterns, and state management conventions so that feature delivery starts from a production-ready base. | 8 |
| E0-US03 | As a Frontend Developer, I want to define app routing, layout shells, and protected route patterns so that Student, Teacher, and Admin experiences can be integrated consistently. | 5 |
| E0-US04 | As a Frontend Developer, I want to use Perplexity to research best practices for App Router, folder structure, caching, and API integration so that architecture decisions are evidence-based. | 3 |
| E0-US05 | As a Frontend Developer, I want to use Google AI Studio and Gemini to generate starter UI components and boilerplate safely so that delivery speed improves without losing architectural control. | 3 |
| E0-US06 | As a Product team, I want a reusable design system foundation so that new microservice screens can be delivered with visual consistency. | 5 |
| E0-US07 | As a QA-oriented team, I want shared frontend conventions for error states, loading states, and form behavior so that integrated features behave predictably across modules. | 3 |

---

## Technical Breakdown

### E0-US01: Define frontend architecture baseline

- [ ] Audit the current frontend structure, dependencies, route organization, and shared UI patterns.
- [ ] Decide whether Sprint 0 will migrate the existing frontend to Next.js App Router or keep the current frontend temporarily while matching the same architecture contracts.
- [ ] Use Perplexity to research best-practice folder structures for Next.js App Router in medium-sized SaaS and microservice-driven products.
- [ ] Use Perplexity to compare colocated feature modules versus layered folders for pages, components, state, and API clients.
- [ ] Define the target frontend architecture document covering routes, layouts, components, API layer, state layer, and shared utilities.
- [ ] Standardize naming conventions for pages, layouts, hooks, stores, DTOs, and API modules.
- [ ] Define environment variable strategy for frontend base URLs, feature flags, and service-aware runtime config.

### E0-US02: Initialize frontend foundation

- [ ] Set up the target frontend shell using Next.js and Tailwind CSS, or establish an approved equivalent foundation if the team deliberately keeps the current React base.
- [ ] Configure TypeScript, ESLint or type-check gates, path aliases, and shared import boundaries.
- [ ] Create the base API client layer for gateway communication, including request interceptors, auth header injection, and shared error mapping.
- [ ] Define state management conventions for auth state, app UI state, and feature-level stores.
- [ ] Create shared utility wrappers for loading, error normalization, toast messaging, and retry-safe API calls.
- [ ] Add a global app shell with header, sidebar, breadcrumb area, and content slots.
- [ ] Establish theming tokens for spacing, colors, typography, surfaces, and form controls.

### E0-US03: Define routing and layout shells

- [ ] Design route groups for public, student, teacher, and admin experiences.
- [ ] Create protected route handling patterns for authenticated and role-restricted pages.
- [ ] Define layout shells for public marketing pages, student dashboard pages, teacher workspace pages, and admin console pages.
- [ ] Create placeholder screens for dashboard, profile, reading, listening, writing, speaking, payment, and notifications so later sprints can integrate incrementally.
- [ ] Build navigation primitives that can hide or reveal links based on role and entitlement.
- [ ] Define loading boundaries and error boundaries for page-level and component-level failures.

### E0-US04: Use Perplexity for architecture research

- [ ] Use Perplexity to research best practices for consuming Node.js microservices through a single API Gateway from Next.js frontend applications.
- [ ] Use Perplexity to research frontend caching and revalidation patterns for assessment pages versus authenticated dashboards.
- [ ] Use Perplexity to research scalable form architecture for auth, submissions, payments, and admin workflows.
- [ ] Summarize the Perplexity findings into team decisions with explicit tradeoffs and chosen conventions.
- [ ] Convert the research output into coding standards that will be reused in Sprint 1 onward.

### E0-US05: Use Google AI Studio and Gemini for boilerplate acceleration

- [ ] Use Google AI Studio to generate responsive dashboard layout component drafts for Student, Teacher, and Admin shells.
- [ ] Use Google AI Studio to generate starter form components for login, register, profile, payment declaration, and submission flows.
- [ ] Use Google AI Studio to generate reusable table, card, modal, empty-state, and notification-list component drafts.
- [ ] Review every AI-generated output for routing fit, accessibility, type safety, and design-system consistency before merge.
- [ ] Refactor generated components to align with the agreed architecture rather than accepting generated code verbatim.

### E0-US06: Build reusable design system foundation

- [ ] Create reusable button, input, textarea, select, card, badge, modal, table, and tabs primitives.
- [ ] Create shared empty, loading, error, and success state components.
- [ ] Create standard page header and section header patterns.
- [ ] Define responsive behavior rules for desktop, tablet, and mobile breakpoints.
- [ ] Build a small component showcase page so later sprint teams can reuse patterns consistently.

### E0-US07: Define shared UX behavior conventions

- [ ] Standardize validation messaging behavior across forms.
- [ ] Standardize optimistic versus pessimistic update rules for mutations.
- [ ] Define notification and toast behavior for success, warning, and error states.
- [ ] Define skeleton loading patterns and long-running request handling conventions.
- [ ] Create a frontend Definition of Ready checklist for any backend service integration starting Sprint 1.

---

## Shared Technical Tasks

### Architecture and Tooling

- [ ] Decide whether the team will create a fresh Next.js app or migrate the current frontend incrementally.
- [ ] Document the approved frontend architecture baseline and publish it for all sprint teams.
- [ ] Establish branch and review rules for AI-generated frontend code.
- [ ] Define prompts and guardrails for Perplexity research and Google AI Studio generation workflows.

### Integration Readiness

- [ ] Create the gateway-aware API client contract that all backend services will plug into.
- [ ] Add mock service adapters so UI flows can be developed before backend endpoints are complete.
- [ ] Create auth-aware layout guards ready for Sprint 1 auth integration.
- [ ] Prepare feature folder placeholders for auth, media, writing, speaking, reading, listening, billing, payment, notifications, and admin modules.

### Testing and Quality

- [ ] Verify the frontend foundation builds successfully and passes type checks.
- [ ] Verify route shells render for public, student, teacher, and admin flows.
- [ ] Verify shared components render correctly across mobile and desktop layouts.
- [ ] Perform manual review of AI-generated components for accessibility, semantic HTML, and consistency.
- [ ] Capture Sprint 0 architecture decisions and unresolved risks for Sprint 1 integration.

---

## Definition of Done for Sprint 0

- Frontend architecture baseline is approved.
- Next.js direction is confirmed, or a documented migration exception exists with equivalent structure delivered.
- Tailwind-based design system primitives are available.
- Route shells and protected layout patterns are implemented.
- Shared API client and state management conventions are ready for service integrations.
- Perplexity research outputs and Google AI Studio generation guidelines are documented and adopted.
