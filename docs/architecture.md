# Architecture and Development Rules

## Purpose

This page defines the default architecture, development environment, and team rules for this project so the team can move quickly without revisiting the same structural decisions every week.

The goal is to keep the system:

- easy to run locally
- easy to understand
- cleanly separated by responsibility
- realistic enough to demonstrate strong database design
- small enough to finish well

## Core Architecture Decision

The project will be built as a modular monolith with clean architecture principles inside the backend.

This means:

- one backend application
- one frontend application
- Docker-managed supporting infrastructure
- no microservice split for the MVP

## Why Not Microservices

Microservices would add extra cost for this scope:

- service-to-service communication
- multiple deployments
- duplicated auth and validation logic
- harder local development
- more debugging overhead
- more time spent on infrastructure than features

For a database final project, a modular monolith keeps the architecture clear without adding unnecessary operational complexity.

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
        +--> Kafka        (domain events / async workflows)
```

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

Forwarded local ports:

- `3000` or the next available host port for the web app
- `8000` or the next available host port for the API
- `5432` or the next available host port for PostgreSQL
- `27017` or the next available host port for MongoDB
- `6379` or the next available host port for Redis
- `9092` or the next available host port for Kafka

When a default host port is occupied, the devcontainer remaps that service to the next free port and records the final bindings in `.devcontainer/docker-compose.ports.yml`.

The `web` and `api` development servers already run inside the devcontainer Compose stack. Root scripts such as `pnpm dev:web`, `pnpm dev:api`, and `pnpm dev` are manual restart and debugging entrypoints, not the default first-run workflow.

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
  architecture.md
  schema.md
  decisions.md
```

## Current Backend Implementation

Today the backend codebase is still in an early scaffolded state. The implemented files are:

```text
/apps/api/src
  main.py
  config.py
  /presentation
    /http
      /routes
        health.py
```

The sections below describe the target backend architecture as the project grows beyond the current health-check slice.

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
  /domain
  /application
  /infrastructure
  /presentation
  /modules
    /clubs
    /members
    /forms
    /events
    /announcements
    /auth
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

Event backbone for non-blocking workflows and demo-visible domain events.

Use it for events such as:

- `club_created`
- `member_added`
- `form_submitted`
- `event_created`
- `announcement_published`

Keep Kafka out of the core CRUD correctness path for the MVP.
