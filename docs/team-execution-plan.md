# Team Execution Plan

## Recommended Final Project Strategy

Use the existing ClubCRM concept and keep the MVP narrow:

- club creation
- member management
- membership assignment
- event creation
- form submission intake
- dashboard summaries

This is enough to clearly demonstrate all required databases without overbuilding.

This document is the main four-person team plan for the database-class project scope. The separate two-person networking and deployment workstream is documented in [docs/networking-team-execution-plan.md](/Users/michaelolave/Projects/active/ClubCRM/docs/networking-team-execution-plan.md).

## Ownership Split for a Team of 4

Use a lead-and-support model for each workstream. One person is the lead developer responsible for driving decisions and keeping the section moving, but implementation and review should still be shared across the team.

### Michael: Project Lead and Frontend, Testing, Docs, Dev Environment, and Docker Lead

Lead responsibilities:

- coordinate the overall project timeline and integration points
- lead the admin-facing UI, forms UI, dashboard, and CRUD screens
- lead testing coordination across frontend and backend workflows
- lead README, screenshots, demo script, and presentation support
- lead the devcontainer, Docker Compose, and environment setup experience

Primary support from the team:

- Chuck supports API contract alignment and backend integration
- Patrick supports forms UX and MongoDB-connected workflow integration
- Lily supports Redis and Kafka integration touches that affect the dashboard, caching, and local environment

Definition of done:

- frontend clearly demonstrates all major flows
- README explains architecture and setup
- reviewer can open the repository in the devcontainer and use the forwarded ports immediately
- live demo sequence is smooth and repeatable

### Chuck: PostgreSQL and Core Backend Lead

Lead responsibilities:

- lead the relational schema design
- lead SQLAlchemy models and Alembic migrations
- lead clubs, members, memberships, events, and announcements CRUD
- lead seed data for structured entities

Primary support from the team:

- Michael supports API-to-frontend coordination, testing, and docs
- Patrick supports workflows that move approved MongoDB submissions into PostgreSQL records
- Lily supports caching and event-driven concerns tied to core backend actions

Definition of done:

- PostgreSQL starts with schema and seed data
- core API endpoints work
- constraints and relationships are documented

### Patrick: MongoDB and Form Workflows Lead

Lead responsibilities:

- lead the form document schema strategy
- lead join request, RSVP, and feedback submission endpoints
- lead the MongoDB persistence adapter
- lead the approval flow that converts selected submissions into PostgreSQL records

Primary support from the team:

- Michael supports forms UI, end-to-end testing, and demo flow
- Chuck supports the structured PostgreSQL follow-up records and backend contract design
- Lily supports Redis or Kafka usage where form submissions trigger cached views or events

Definition of done:

- raw form payloads persist in MongoDB
- at least one submission type is visible in UI
- one structured follow-up workflow is implemented

### Lily: Redis and Kafka Design Lead

Lead responsibilities:

- lead the Redis caching design and adapters
- lead the Kafka producer and one consumer or observable event flow
- lead event and cache design decisions that support dashboard and workflow performance
- help drive health checks and startup reliability for the local application stack used by the database project

Primary support from the team:

- Michael supports Docker, devcontainer, environment config, and dashboard integration
- Chuck supports emitting events from core backend workflows
- Patrick supports form-driven events and cached read models connected to submissions

Definition of done:

- caches populate for dashboard reads
- at least one event is published and demonstrated
- Redis and Kafka responsibilities are clearly integrated into the main app workflows

Note:

- `k3s`, `Longhorn`, Kubernetes ingress, and deployment orchestration for the networking course are tracked separately in [docs/networking-team-execution-plan.md](/Users/michaelolave/Projects/active/ClubCRM/docs/networking-team-execution-plan.md)

## Suggested Repo Shape

```text
/apps
  /api
  /web
/.devcontainer
  devcontainer.json
  docker-compose.devcontainer.yml
/infra
  docker-compose.yml
/docs
  architecture.md
  schema.md
```

## MVP Feature Contract

To avoid scope creep, treat these as the required features:

- create club
- list clubs
- create member
- assign member to club
- submit join request form
- create event
- create announcement
- view dashboard summary with Redis-backed cache
- publish at least one Kafka event during a core workflow

Anything else should be labeled stretch.

## Checkpoint Deliverables

### Checkpoint 1: Proposal due Sunday, March 22, 2026

- slideshow with topic, roles, scope, and database choices

### Checkpoint 2: Architecture due Sunday, March 29, 2026

- architecture diagram
- service boundaries
- entity map
- data flow between databases

### Checkpoint 3: Proof of Concept due Sunday, April 5, 2026

- repository devcontainer working end to end
- PostgreSQL, MongoDB, Redis, and Kafka all starting locally
- seed data loaded
- one real app workflow demonstrated

These checkpoints describe the database-project application deliverables. Networking-course deployment milestones should be tracked separately so they do not blur ownership of the main four-person app scope.

## What To Put In The Slideshow

Use 6 slides max for the proposal:

1. Project title and team members
2. Problem and target users
3. MVP scope
4. Database choices and why
5. High-level architecture diagram
6. Timeline and team responsibilities

## Strong Demo Story

Use one clean story in the final presentation:

1. Admin creates a new club
2. Admin adds a member
3. Member is assigned to the club
4. Student submits a join or RSVP form
5. Raw form appears in MongoDB-backed workflow
6. Dashboard loads quickly from Redis-backed cache
7. Kafka event log shows the action stream

That sequence makes every database visible in a way the class can understand quickly.
