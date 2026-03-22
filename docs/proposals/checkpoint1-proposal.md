# Checkpoint 1 Proposal

## Project Title

**ClubCRM: Multi-Database Club Management Platform**

## Team Composition

- Team size: 4
- Suggested roles:
  - Member 1: Backend lead and PostgreSQL owner
  - Member 2: Forms and MongoDB owner
  - Member 3: Infrastructure, Redis, and Kafka owner
  - Member 4: Frontend, UX, and demo/documentation owner

## Proposed Topic

We will build a club and member management CRM for Champlain College. The system supports one organization with many clubs, shared member records, club memberships, events, announcements, and form-based intake workflows.

This fits the course well because it uses multiple database models for different responsibilities inside one cohesive product instead of forcing every feature into a single database.

## Problem Statement

Student clubs often manage members, events, and communication across spreadsheets, emails, and separate forms. That creates duplicate data, inconsistent records, and weak visibility into club activity.

ClubCRM solves this by centralizing club administration in one application while still using the right storage model for each kind of data.

## Scope

### MVP Scope

- organization admin can create and manage clubs
- managers can create and update member records
- one member can belong to multiple clubs
- managers can create events and announcements
- users can submit join, RSVP, and feedback forms
- dashboard shows club summaries and recent activity

### Stretch Scope

- email notifications
- activity analytics
- attendance tracking
- searchable announcement history
- deployed public demo URL

## Database Plan

### 1. PostgreSQL

**Purpose:** primary system of record for structured business data

Store here:

- organizations
- clubs
- admin users
- managers and roles
- members
- memberships
- events
- announcements

Why it belongs:

- strong relational integrity
- foreign keys and constraints
- clear transactional behavior for CRUD workflows

### 2. MongoDB

**Purpose:** flexible storage for semi-structured form submissions

Store here:

- join requests
- interest forms
- RSVP payloads
- feedback submissions

Why it belongs:

- form payloads may vary by club and form type
- raw submissions are easier to keep as documents

### 3. Redis

**Purpose:** caching and fast short-lived lookups

Store here:

- dashboard summary cache
- recent club activity cache
- hot member and club lookup results
- optional session or token data

Why it belongs:

- fast response times for repeated reads
- easy demonstration of disposable cache architecture

### 4. Kafka

**Purpose:** event-driven messaging for non-blocking workflows

Publish events such as:

- `club_created`
- `member_added`
- `form_submitted`
- `event_created`
- `announcement_published`

Why it belongs:

- demonstrates asynchronous architecture
- allows side effects without blocking core CRUD paths

## High-Level Architecture

```text
Next.js Frontend
        |
        v
   FastAPI Backend
        |
        +--> PostgreSQL   (core records)
        +--> MongoDB      (raw form submissions)
        +--> Redis        (cache)
        +--> Kafka        (domain events)
```

## Example Data Flow

1. An admin creates a club in the web UI.
2. FastAPI validates the request and writes the club to PostgreSQL.
3. The backend publishes a `club_created` event to Kafka.
4. Redis cache for organization dashboard summaries is refreshed or invalidated.
5. A student later submits a join request form.
6. The raw submission is stored in MongoDB.
7. The backend can optionally convert approved submissions into structured member records in PostgreSQL.

## Tech Stack

- Frontend: Next.js
- Backend: FastAPI
- Core database: PostgreSQL
- Document database: MongoDB
- Cache: Redis
- Event streaming: Kafka
- Development environment: repository devcontainer backed by Docker Compose

## Why This Topic Fits a Team of 4

This project is a strong fit for a 4-person team because the work naturally divides into four parallel areas without forcing artificial tasks:

- relational schema and business CRUD
- form/document workflows
- infrastructure and distributed components
- frontend, user flows, and demo polish

It is challenging enough to justify 4 contributors, but still realistic to finish by April 30, 2026.

## Milestone Plan

### By Sunday, March 22, 2026

- finalize topic
- confirm team roles
- finalize database choices
- submit proposal slideshow

### By Sunday, March 29, 2026

- architecture diagram completed
- core entity schema drafted
- API boundaries defined

### By Sunday, April 5, 2026

- open the repository in the devcontainer and let it start the project services
- PostgreSQL running with seed data
- FastAPI connected to the local data stack
- first core workflow demonstrable

### By Sunday, April 12, 2026

- core club and member CRUD usable
- form submission path working
- initial feedback from testers collected

### By Saturday, April 19, 2026

- feature freeze
- bug fixing, UI cleanup, and README improvements only

### By Sunday, April 26, 2026

- writeup draft completed
- code freeze already in effect by Wednesday, April 22, 2026
- peer review issues resolved

### By Thursday, April 30, 2026

- live demo ready
- backup demo recording ready
- final slides, repo, and writeup links submitted

## Risk Management

### Main Risks

- too much feature scope
- Docker and multi-service setup complexity
- Kafka configuration and startup reliability
- unclear ownership across the team

### Mitigation

- keep MVP centered on clubs, members, and forms
- treat analytics and advanced notifications as stretch goals
- keep Kafka outside core CRUD correctness even though it runs in the standard local stack
- assign one clear owner per major system area

## Submission Summary

For Checkpoint 1, this proposal covers the required items:

- chosen topic
- team composition and roles
- scope description
- databases used and why
