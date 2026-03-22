# Architecture Decision Record

## Current Decisions

### ADR-001: Use a modular monolith for MVP

- Status: accepted
- Decision: keep one backend and one frontend application instead of splitting into microservices.
- Rationale: the team gets clear module boundaries without paying the cost of distributed infrastructure during the MVP.

### ADR-002: Use FastAPI for the backend

- Status: accepted
- Decision: implement the API in FastAPI.
- Rationale: it is a good fit for CRUD-heavy backend work, validation, and rapid iteration in Python.

### ADR-003: Use Next.js for the frontend

- Status: accepted
- Decision: build the admin-facing UI in Next.js.
- Rationale: it gives the team a straightforward web application stack for dashboard and CRUD workflows.

### ADR-004: Use PostgreSQL as the system of record

- Status: accepted
- Decision: store core business entities in PostgreSQL.
- Rationale: organizations, clubs, members, memberships, events, announcements, and roles require relational integrity and constraints.

### ADR-005: Use MongoDB for raw form submissions

- Status: accepted
- Decision: store flexible form payloads in MongoDB.
- Rationale: join requests, RSVPs, interest forms, and feedback can vary by club and form type.

### ADR-006: Use Redis for cache and short-lived data

- Status: accepted
- Decision: use Redis for dashboard caches and other temporary lookups.
- Rationale: repeated read paths should be fast, disposable, and separate from the primary data model.

### ADR-007: Include Kafka in the local stack for observable async workflows

- Status: accepted
- Decision: run Kafka in the standard local environment for observable asynchronous workflows, but keep it out of the core correctness path.
- Rationale: the team can demonstrate event-driven behavior consistently without making CRUD flows depend on Kafka availability.

### ADR-008: Keep authenticated users limited to admins and managers

- Status: accepted
- Decision: only organization admins and club managers log into the system.
- Rationale: this reduces scope while still supporting realistic club-management workflows.

### ADR-009: Model members at the organization level

- Status: accepted
- Decision: a member exists once per organization and can belong to multiple clubs.
- Rationale: this avoids duplicate member records and supports cross-club participation cleanly.

### ADR-010: Standard local development uses the repository devcontainer

- Status: accepted
- Decision: standard development happens in the repository devcontainer, which uses `infra/docker-compose.yml` together with `.devcontainer/docker-compose.devcontainer.yml` to bring up the workspace, app services, and supporting infrastructure.
- Rationale: the team needs one repeatable local setup for frontend, backend, and all supporting data services, and the devcontainer makes that workflow the default for every contributor.
