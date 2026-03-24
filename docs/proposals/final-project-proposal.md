# Final Project Proposal Option 1: Club Management CRM

## Project Title

**ClubCRM: A Club and Member Management System for Champlain College**

## Team Goal

Build a centralized club management platform for Champlain College that helps organization administrators and club leaders manage clubs, members, events, and announcements in one system.

## Why This Project

This project is a strong fit for a database class because it combines relational, document, caching, and event-driven technologies in a realistic campus use case. It also has a clear and manageable core scope while still leaving room for future expansion.

## Problem Statement

Student clubs often manage their operations using spreadsheets, email threads, forms, and disconnected tools. This makes it difficult to maintain accurate records, track member involvement, coordinate events, and keep communication organized. At the organization level, there is no centralized way to oversee club activity or maintain consistent data across multiple clubs.

Champlain College needs a system that can manage one organization with many clubs, support club-level administration, and make member information easier to organize and maintain.

## Proposed Solution

We propose building **ClubCRM**, a CRM-style web application tailored to student clubs and small campus teams. The system will be structured around one organization, **Champlain College**, which can contain many clubs. Each club will have its own management roles and its own members, while member records will exist at the organization level so that one student can belong to multiple clubs without duplicate records.

Only organization administrators and club managers will log into the system. Regular members will not need accounts. Instead, members can be added manually or through forms sent by email. This keeps the system simple for the demo while still supporting realistic club workflows.

## Project Scope

The current project scope is limited to **Champlain College** as the single parent organization.

The system will support:

- one organization with many clubs
- organization-level administrators
- club-level management roles
- organization-level member records
- club membership assignment
- event and announcement management
- form-based member interaction

The most important features for the demo are:

- club creation
- basic member management

## Core Users

Authenticated users in the system will include:

- Organization Admin
- Club Main Admin
- Club President
- Club Treasurer
- Club Event Manager
- Club Communications Manager

Regular members will not log into the system.

## Core Features

- Organization-level club creation and oversight
- Club profile management
- Basic member management
- Organization-level member records
- Club membership assignment
- Event creation and RSVP collection
- Club announcements
- Email-based forms for:
  - interest
  - join requests
  - RSVP
  - feedback

## Data Model

The application will be based on the following structure:

- one `Organization` has many `Clubs`
- one `Organization` has many `Members`
- one `Club` belongs to one `Organization`
- one `Member` can belong to many `Clubs`
- club membership is handled through a relationship table or collection

This structure avoids duplicate member records while still supporting multi-club participation.

## Database Design

This project will use multiple technologies, each selected for a specific type of data or system behavior.

### 1. PostgreSQL (Relational Database)

PostgreSQL will serve as the primary database for structured and relational data.

Examples of stored data:

- organizations
- clubs
- club manager accounts
- roles and permissions
- members
- club memberships
- events
- announcements

Why it fits:

- supports strong relationships between core entities
- allows constraints and consistency for important records
- works well for joins, reporting, and transactional operations

### 2. MongoDB (Document Database)

MongoDB will be used for flexible or semi-structured data.

Examples of stored data:

- raw form submissions
- interest form responses
- join form responses
- RSVP responses
- feedback responses

Why it fits:

- form responses may vary in structure
- allows flexible document storage without forcing every response into fixed columns
- complements the relational model without replacing it

### 3. Redis (Key-Value Store)

Redis will be used for fast temporary data access.

Examples of stored data:

- cached dashboard summaries
- session-related data
- temporary counters
- frequently requested club/member lookups

Why it fits:

- improves application performance
- useful for short-lived or repeatedly accessed data
- demonstrates use of a different database access pattern

### 4. Kafka (Event Streaming)

Kafka will support asynchronous event-driven workflows.

Examples of events:

- club created
- member added
- form submitted
- event created
- announcement published

Why it fits:

- allows the system to process events asynchronously
- supports future notification or analytics workflows
- demonstrates scalable messaging architecture

Current local development setup:

- the repository devcontainer is the standard development environment
- the devcontainer uses Docker Compose under the hood with `infra/docker-compose.yml`, `.devcontainer/docker-compose.devcontainer.yml`, and a generated `.devcontainer/docker-compose.ports.yml`
- the devcontainer starts the `workspace` service plus PostgreSQL, MongoDB, Redis, Kafka, the API, and the web app
- the default local developer ports are `3000`, `8000`, `5432`, `27017`, `6379`, and `9092`, with automatic remapping to the next free host port when needed

## Example Data Flow

- An organization admin creates a club, and the club record is stored in PostgreSQL.
- A manager manually adds a member or receives a member submission through an emailed form.
- The structured member record is stored in PostgreSQL, while the raw form payload can be stored in MongoDB.
- Redis caches dashboard summaries for faster reads.
- Kafka publishes events such as `club_created` or `member_added` for future processing.

## Application Stack

- Frontend: Next.js
- Backend: Python with FastAPI
- Relational Database: PostgreSQL
- Document Database: MongoDB
- Cache Layer: Redis
- Event Streaming: Kafka
- Development Environment: repository devcontainer backed by Docker Compose

## Methodology

The project will be developed iteratively in stages:

### Week 1

- finalize requirements
- define user roles and permissions
- design database schema and system architecture

### Week 2

- build backend API with FastAPI
- set up PostgreSQL, MongoDB, Redis, and Kafka
- implement club creation and core member models

### Week 3

- build Next.js frontend for admins and club managers
- connect member forms and club management workflows
- implement basic announcements and event management

### Week 4

- test and refine CRUD workflows
- improve UI and validation
- prepare demo, report, and architecture explanation

## Suggested Team Split

- Member 1: PostgreSQL schema, relational models, and CRUD operations
- Member 2: MongoDB form response storage and backend integration
- Member 3: Redis caching, Kafka event flow, and infrastructure setup
- Member 4: Next.js frontend, UI workflows, and testing/documentation

## Deliverables

- working web application
- schema and architecture diagrams
- sample dataset
- CRUD operations for clubs and members
- form submission workflow
- final presentation and report

## Expected Outcomes

By the end of the project, the team expects to deliver:

- a centralized club management system for Champlain College
- a working demo of club creation
- a working demo of basic member management
- a multi-database architecture that reflects realistic application design
- a scalable foundation for future features such as attendance, analytics, and dues tracking

## Risks

- integrating several technologies may increase setup complexity
- the project could become too broad if too many club features are added
- role and permission design may become overly detailed for the initial scope

## Risk Mitigation

- keep the MVP focused on club creation and basic member management
- treat advanced features as stretch goals
- use PostgreSQL as the source of truth for core records
- limit role differences in the MVP where appropriate

## Why This Is a Good Choice

This project is practical, relevant to campus life, and technically strong for a database final project. It demonstrates the use of multiple data systems in a meaningful way while keeping the initial demo focused and achievable. It also solves a real organizational problem and can be expanded in the future without redesigning the entire system.
