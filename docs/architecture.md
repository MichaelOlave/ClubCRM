# Architecture and Development Rules

## Purpose

This page defines the default architecture, development environment, and team rules for this project so the team can move quickly without revisiting the same structural decisions every week.

The goal is to keep the system:

- easy to run locally
- easy to understand
- cleanly separated by responsibility
- realistic enough to demonstrate strong database design
- small enough to finish well

This project now supports two related course deliverables:

- a primary database-project workstream centered on application design, data modeling, and multi-database responsibilities
- a separate networking workstream centered on deployment, orchestration, cluster networking, and persistent storage

The application architecture in this document remains the main source of truth for the core ClubCRM system. The networking workstream builds on top of that application rather than replacing it.

## Core Architecture Decision

The project will be built as a modular monolith with clean architecture principles inside the backend.

This means:

- one backend application
- one frontend application
- Docker-managed supporting infrastructure
- no microservice split for the MVP

For the database-focused work, the application should remain a modular monolith even if the deployment target later uses Kubernetes. The networking course deliverable should demonstrate orchestration around this architecture, not split the app into separate business services.

## Why Not Microservices

Microservices would add extra cost for this scope:

- service-to-service communication
- multiple deployments
- duplicated auth and validation logic
- harder local development
- more debugging overhead
- more time spent on infrastructure than features

For the main database project, a modular monolith keeps the architecture clear without adding unnecessary operational complexity.

## High-Level System Shape

```text
Next.js Frontend
        |
        v
   FastAPI Backend
        |
        +--> PostgreSQL   (system of record)
        +--> MongoDB      (flexible form submissions)
        +--> Redis        (cache / short-lived data)
        +--> Kafka        (scaffolded async event boundary)
```

## Workstream Boundary

The project has two layers of responsibility:

- core application architecture, owned by the main database-project plan
- deployment and orchestration architecture, owned by the companion networking plan

The core application layer includes:

- frontend behavior
- backend module structure
- relational and document data responsibilities
- cache and event-driven application behavior
- external authentication plus internal ClubCRM authorization

The companion networking layer includes:

- `k3s` cluster deployment
- `Longhorn` persistent storage
- ingress and service routing
- Kubernetes service communication
- deployment reliability and recovery behavior
- an optional companion cluster visualizer for the networking demo, kept separate from the core
  ClubCRM `web` and `api` apps

See [plans/team-execution-plan.md](plans/team-execution-plan.md) and [plans/networking-team-execution-plan.md](plans/networking-team-execution-plan.md) for the original course-planning context behind these workstreams.

## Local Development Environment

All day-to-day development should happen in the repository devcontainer so every team member uses the same environment.

The Compose services load checked-in defaults from `.env.example` during startup. When a developer needs local overrides, they can create `.env` from `.env.example` at the repository root before opening the devcontainer.

The repository devcontainer uses Docker Compose with these files:

- `infra/docker-compose.yml`
- `.devcontainer/docker-compose.devcontainer.yml`
- `.devcontainer/docker-compose.ports.yml` generated at startup

The full local stack includes:

- `web` for Next.js
- `api` for FastAPI
- `postgres`
- `mongodb`
- `redis`
- `kafka`

When the devcontainer opens, it starts:

- generates `.devcontainer/docker-compose.ports.yml` with the first available host port for each required service
- `workspace`
- `web`
- `api`
- `postgres`
- `mongodb`
- `redis`
- `kafka`

The devcontainer persists the PNPM store, workspace `node_modules`, web `node_modules`, web `.next`,
and the API virtualenv in Docker volumes so dependency-heavy paths stay off the bind-mounted workspace.
The `api` and `web` services wait for their dependencies to pass health checks before they start.

Forwarded local ports:

- `3000` or the next available host port for the web app
- `8000` or the next available host port for the API
- `5432` or the next available host port for PostgreSQL
- `27017` or the next available host port for MongoDB
- `6379` or the next available host port for Redis
- `9092` or the next available host port for Kafka

When a default host port is occupied, the devcontainer remaps that service to the next free port and records the final bindings in `.devcontainer/docker-compose.ports.yml`.

The `web` and `api` development servers already run inside the devcontainer Compose stack. Root scripts such as `pnpm dev:web`, `pnpm dev:api`, and `pnpm dev` are manual restart and debugging entrypoints, not the default first-run workflow.

Docker Compose in the devcontainer remains the standard local development environment for the full team. If the networking workstream deploys the application to `k3s`, treat that as a companion deployment target for the networking deliverable, not as a replacement for the default development workflow.

## Repository Shape

```text
/apps
  /web
  /api
/.devcontainer
  devcontainer.json
  docker-compose.devcontainer.yml
/infra
  docker-compose.yml
/docs
  README.md
  /assets
  architecture.md
  contributing.md
  schema.md
  decisions.md
  /deployment
  /guides
  /plans
  /proposals
```

The repository may also grow deployment artifacts for the networking workstream, such as Kubernetes manifests, Helm values, or environment-specific deployment documentation. Those artifacts should support the existing app architecture rather than redefine it.

## Current Frontend Implementation

Today the frontend remains UI-first, but many of its server-side feature modules now call live backend endpoints. The implemented web app uses App Router route groups for the admin shell and public entry points, plus protected system routes that share the same auth model:

```text
/apps/web/src
  /app
    page.tsx                 # public landing page that reads backend auth state for CTA routing
    /(app)
      layout.tsx
      /dashboard
      /profile
      /clubs
        /[clubId]
          /join-requests
      /members
        /[memberId]
    /system
      layout.tsx
      /audit
      /health
        /live-routing
    /(public)
      layout.tsx
      /docs
      /login
      /not-provisioned
      /testing
      /join
        /[clubId]
    /api
      /auth
        /login
    /auth
      /callback
    /demo
      /failover
        /recycle
  /features
    /audit
    /auth
    /clubs
    /dashboard
    /docs
    /forms
      /join-request
    /health
    /landing
    /members
    /memberships
    /profile
    /testing
```

Most current web data flows through server-side modules under `apps/web/src/features/*/server`; many of those modules call the API while route-level composition stays in the web app. The frontend currently relies on backend-owned auth session checks and auth proxy routes, the `/profile` diagnostics surface, `/system/health`, `/system/audit`, dashboard summaries, club and member CRUD flows, club-manager grant management, event and announcement management, the public join-request submission and review flow, and the public `/demo/failover` networking-demo route. The admin shell is also role-aware: org admins see the full workspace, while club managers see a reduced shell scoped to their assigned clubs.

## Current Backend Implementation

Today the backend is a real modular HTTP surface, not just a scaffold. The repo already encodes the intended backend layering through bootstrap, shared router composition, feature modules, infrastructure adapters, and unit tests, and several of those modules now power live product behavior.

```text
/apps/api/src
  main.py
  /bootstrap
    app_factory.py
    dependencies.py
  /config
    settings.py
  /presentation
    /http
      router.py
      exception_handlers.py
  /infrastructure
    /auth
    /postgres
    /mongodb
    /redis
    /kafka
  /modules
    /system
      /presentation
        /http
          routes.py
    /audit
    /dashboard
    /clubs
    /forms
    /members
    /memberships
    /events
    /announcements
    /auth
/apps/api/tests
  /unit
    /modules
    /infrastructure
```

`GET /health` remains the baseline diagnostics handler, but the live API surface now also includes the backend-owned `/auth` session flow, `/audit-logs`, `/dashboard/summary`, `/dashboard/summary/{club_id}`, `/dashboard/redis-analytics/{club_id}`, the join-request workflow under `/forms`, and CRUD-style routes for clubs, members, memberships, announcements, and events. The sections below describe how that module-first structure should keep growing as more persistence behavior moves behind those routes.

## Auth and Authorization Model

Authentication and app authorization are separate concerns.

- External identity still starts in the backend-owned `/auth` flow.
- The backend session payload now distinguishes:
  - `authenticated`: the user completed the identity-provider flow
  - `authorized`: the user also has a ClubCRM access grant
- ClubCRM currently supports two permission-bearing roles:
  - `org_admin`
  - `club_manager`

Authorization is resolved in PostgreSQL after login.

- `admin_users` is now an organization-admin grant table, not a local-password table.
- `club_manager_roles` is the source of truth for club-manager authorization.
- `memberships.role` remains roster or display data and does not grant app permissions.
- `auth_user_bindings` persists the relationship between the external provider subject (`sub`) and the internal grant target.

The binding flow is hybrid by design.

- First successful login resolves by email against existing grants.
- A successful match writes a persistent subject binding.
- Later logins resolve by subject first, not by email.
- Authenticated users without a matching admin or manager grant keep a valid backend session, but they are not allowed into the protected app shell.

Current route rules follow that access model.

- Org admins keep full CRUD access across the current protected API surface.
- Club managers are limited to their assigned clubs for club detail, roster changes, join-request review, events, announcements, and dashboard data.
- Org-wide member directory and diagnostics flows remain org-admin only in this slice.

## Target Backend Architectural Style

Inside the backend, use a clean or hexagonal style with feature modules.

Separate:

- domain logic
- application use cases
- infrastructure details
- delivery concerns such as HTTP routes

Suggested target structure:

```text
/apps/api/src
  main.py
  /bootstrap
  /config
  /presentation
    /http
      router.py
      exception_handlers.py
  /infrastructure
  /modules
    /system
      /presentation
        /http
    /clubs
      /domain
      /application
        /commands
        /queries
        /ports
      /presentation
        /http
    /members
      /domain
      /application
        /commands
        /queries
        /ports
      /presentation
        /http
    /memberships
      /domain
      /application
        /commands
        /queries
        /ports
      /presentation
        /http
    /forms
      /domain
      /application
        /commands
        /queries
        /ports
      /presentation
        /http
    /events
      /domain
      /application
        /commands
        /queries
        /ports
      /presentation
        /http
    /announcements
      /domain
      /application
        /commands
        /queries
        /ports
      /presentation
        /http
    /auth
      /domain
      /application
        /commands
        /queries
        /ports
      /presentation
        /http
/apps/api/tests
  /unit
    /modules
    /infrastructure
```

## Layer Responsibilities

### Domain

Contains business concepts and rules such as:

- `Club`
- `Member`
- `Membership`
- `Event`
- permission rules
- business validation rules

The domain layer should not know about FastAPI, SQLAlchemy details, MongoDB details, Redis, or Docker.

### Application

Contains use cases and orchestration such as:

- create club
- add member
- assign member to club
- publish announcement
- submit RSVP

The application layer calls domain logic, uses repository interfaces, coordinates workflows, and avoids framework-specific HTTP code.

### Infrastructure

Contains implementation details such as:

- PostgreSQL repositories
- MongoDB form storage adapters
- Redis cache adapters
- Kafka publishers
- database connection setup

Infrastructure depends on the application and domain layers, not the other way around.

### Presentation

Contains delivery concerns such as:

- FastAPI routes
- request validation
- response models
- auth middleware

This layer translates HTTP requests into application use cases.

## Feature Modules

Organize by business module, not only by technical folder.

Primary modules:

- `clubs`
- `members`
- `memberships`
- `events`
- `announcements`
- `forms`
- `auth`

Each module should own:

- its use cases
- its route handlers
- its schemas
- its repository interfaces
- its tests where possible

## Database Responsibilities

Each database should have a clear responsibility.

### PostgreSQL

Primary source of truth for relational business data.

Store here:

- organizations
- clubs
- admin users
- managers and roles
- members
- memberships
- events
- announcements

Rules:

- all core relational data belongs here
- business-critical records live here
- use foreign keys and constraints where appropriate

### MongoDB

Flexible store for semi-structured documents.

Store here:

- raw join form submissions
- interest forms
- RSVP payloads
- feedback submissions

Rules:

- do not move core club or member data into MongoDB
- MongoDB supports flexibility, but it is not the system of record

### Redis

Speed layer, not permanent truth.

Store here:

- cached dashboard summaries
- recent club activity cache
- session or token data if needed
- frequently requested club or member lookup results

### Kafka

Intended event backbone for non-blocking workflows and demo-visible domain events. The local stack
provisions Kafka and the backend already has publisher ports/adapters, but the current adapters are
still scaffolded and record event metadata in memory instead of sending broker-backed messages.

Use it for events such as:

- `club_created`
- `member_added`
- `form_submitted`
- `event_created`
- `announcement_published`

Keep Kafka out of the core CRUD correctness path for the MVP.
