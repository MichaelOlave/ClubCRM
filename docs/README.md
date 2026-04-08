# ClubCRM Docs

Use this directory as the main entry point for project documentation.

## Start Here

- [Contributing](contributing.md) for setup, workflow, and code standards
- [Architecture](architecture.md) for system structure, module boundaries, and environment rules
- [Schema Overview](schema.md) for the target data model
- [Architecture Decisions](decisions.md) for accepted project-level decisions

## App-Specific Docs

- [Web App README](../apps/web/README.md) for the current Next.js route surface and frontend-specific runtime assumptions
- [API README](../apps/api/README.md) for the current FastAPI module layout and live route groups

## Implementation Guides

- [Module Implementation Flow](guides/module-implementation-flow.md) for adding a feature or module slice
- [PostgreSQL Implementation Flow](guides/postgresql-implementation-flow.md) for relational system-of-record work
- [MongoDB Implementation Flow](guides/mongodb-implementation-flow.md) for document-style persistence work
- [Redis Implementation Flow](guides/redis-implementation-flow.md) for caching and short-lived data
- [Kafka Implementation Flow](guides/kafka-implementation-flow.md) for async events and side effects

## Planning and Historical Context

- [Team Execution Plan](plans/team-execution-plan.md) for the main database-project delivery plan
- [Networking Team Execution Plan](plans/networking-team-execution-plan.md) for the companion deployment workstream
- [Checkpoint 1 Proposal](proposals/checkpoint1-proposal.md) for the checkpoint submission draft
- [Final Project Proposal](proposals/final-project-proposal.md) for the fuller project proposal

The proposal documents capture planned scope at the time they were written. Prefer the root README,
the app READMEs, and the current-state analysis for the implemented surface.

## Deployment and Analysis

- [SSH Docker Deployment](deployment/ssh-docker-deploy.md) for the current VM deployment path
- [Current Project Structure Analysis](analysis/current-project-structure-analysis.md) for a deeper review of the repo layout and tradeoffs

## Assets

- [System Diagram](assets/system-diagram.png)
- [Network Diagram](assets/network-arcitecture.png)
