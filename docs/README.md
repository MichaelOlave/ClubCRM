# ClubCRM Docs

Use this directory as the main entry point for project documentation.

## Start Here

- [Contributing](contributing.md) for setup, workflow, and code standards
- [Architecture](architecture.md) for system structure, module boundaries, and environment rules
- [Schema Overview](schema.md) for the target data model
- [Architecture Decisions](decisions.md) for accepted project-level decisions

## App-Specific Docs

- `apps/web/README.md` for the current Next.js route surface and frontend-specific runtime assumptions
- `apps/api/README.md` for the current FastAPI module layout and live route groups
- `apps/monitor-web/README.md` for the standalone monitoring dashboard surface
- `apps/monitor-api/README.md` for the standalone monitoring API contract

## Implementation Guides

- [Module Implementation Flow](guides/module-implementation-flow.md) for adding a feature or module slice
- [PostgreSQL Implementation Flow](guides/postgresql-implementation-flow.md) for relational system-of-record work
- [MongoDB Implementation Flow](guides/mongodb-implementation-flow.md) for document-style persistence work
- [Redis Implementation Flow](guides/redis-implementation-flow.md) for caching and short-lived data
- [Kafka Implementation Flow](guides/kafka-implementation-flow.md) for async events and side effects

## Testing

- [Live Site Testing Guide](guides/live-site-testing.md) for manual smoke testing on the production site

## Planning and Historical Context

- [Team Execution Plan](plans/team-execution-plan.md) for the original database-project delivery plan
- [Networking Team Execution Plan](plans/networking-team-execution-plan.md) for the companion deployment workstream
- [Checkpoint 1 Proposal](proposals/checkpoint1-proposal.md) for the historical checkpoint submission draft
- [Final Project Proposal](proposals/final-project-proposal.md) for the historical project proposal

These planning and proposal docs capture course-era context. Treat them as historical reference rather than the current runtime source of truth.

The proposal documents capture planned scope at the time they were written. Prefer the root README,
the app READMEs, and the current-state analysis for the implemented surface.

## Deployment and Analysis

- [SSH Docker Deployment](deployment/ssh-docker-deploy.md) for the current VM deployment path
- [Companion Monitoring Stack Guide](deployment/companion-monitoring-stack.md) for the companion monitoring app architecture and data flow
- [Monitoring Stack Deployment](deployment/monitoring-stack.md) for the companion networking-demo visualizer deployment steps
- [Production Monitor Server](deployment/prod-monitor-server.md) for the Hostinger VPS running the live monitoring stack and production Docker app
- [Cluster Snapshot](deployment/cluster-snapshot.md) for a verified point-in-time record of all running pods, volumes, services, and node state (captured 2026-04-28)
- [Current Longhorn Implementation Status](deployment/current-longhorn-implementation.md) for the repo-backed and live-cluster view of Longhorn, including current breakage and drift
- [k3s + Kubero + Longhorn Runbook](deployment/k3s-kubero-longhorn.md) for the networking-final cluster rollout
- [Final Project Development Writeup](analysis/final-project-development-writeup.md) for the project-wide end-state summary and lessons learned
- [Current Project Structure Analysis](analysis/current-project-structure-analysis.md) for a point-in-time April 2026 review of the repo layout and tradeoffs

## Assets

- [System Diagram](assets/system-diagram.png)
- [Network Diagram](assets/network-architecture.png)
