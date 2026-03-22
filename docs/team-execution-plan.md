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

## Ownership Split for a Team of 4

### Member 1: PostgreSQL and Core Backend

Own:

- relational schema
- SQLAlchemy models
- Alembic migrations
- clubs, members, memberships, events, announcements CRUD
- seed data for structured entities

Definition of done:

- PostgreSQL starts with schema and seed data
- core API endpoints work
- constraints and relationships are documented

### Member 2: MongoDB and Form Workflows

Own:

- form document schema strategy
- join request, RSVP, and feedback submission endpoints
- MongoDB persistence adapter
- approval flow that converts selected submissions into PostgreSQL records

Definition of done:

- raw form payloads persist in MongoDB
- at least one submission type is visible in UI
- one structured follow-up workflow is implemented

### Member 3: Docker, Redis, Kafka, and Dev Experience

Own:

- Docker Compose
- environment config
- Redis caching adapters
- Kafka producer and one consumer or observable event flow
- health checks and startup reliability

Definition of done:

- reviewer can run `docker compose -f infra/docker-compose.yml up`
- caches populate for dashboard reads
- at least one event is published and demonstrated

### Member 4: Next.js Frontend, Demo Flow, and Docs

Own:

- admin-facing UI
- forms UI
- dashboard and CRUD screens
- README, screenshots, demo script, and presentation support
- testing coordination

Definition of done:

- frontend clearly demonstrates all major flows
- README explains architecture and setup
- live demo sequence is smooth and repeatable

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
  demo-script.md
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

- Docker Compose working
- PostgreSQL, MongoDB, Redis, and Kafka all starting locally
- seed data loaded
- one real app workflow demonstrated

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
