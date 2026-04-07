# ClubCRM Docs

Use this directory as the main entry point for project documentation.

## Start Here

- [Contributing](contributing.md) for setup, workflow, and code standards
- [Architecture](architecture.md) for system structure, module boundaries, and environment rules
- [Schema Overview](schema.md) for the target data model
- [Architecture Decisions](decisions.md) for accepted project-level decisions

## Implementation Guides

- [Module Implementation Flow](guides/module-implementation-flow.md) for adding a feature or module slice
- [PostgreSQL Implementation Flow](guides/postgresql-implementation-flow.md) for relational system-of-record work
- [MongoDB Implementation Flow](guides/mongodb-implementation-flow.md) for document-style persistence work
- [Redis Implementation Flow](guides/redis-implementation-flow.md) for caching and short-lived data
- [Kafka Implementation Flow](guides/kafka-implementation-flow.md) for async events and side effects

## Planning

- [Team Execution Plan](plans/team-execution-plan.md) for the main database-project delivery plan
- [Networking Team Execution Plan](plans/networking-team-execution-plan.md) for the companion deployment workstream
- [Checkpoint 1 Proposal](proposals/checkpoint1-proposal.md) for the checkpoint submission draft
- [Final Project Proposal](proposals/final-project-proposal.md) for the fuller project proposal

## Deployment and Analysis

- [SSH Docker Deployment](deployment/ssh-docker-deploy.md) for the current VM deployment path
- [Companion Monitoring Stack Guide](deployment/companion-monitoring-stack.md) for the companion
  monitoring app architecture, data flow, and operating model
- [Monitoring Stack Deployment](deployment/monitoring-stack.md) for the companion networking-demo
  control plane deployment steps
- [Current Longhorn Implementation Status](deployment/current-longhorn-implementation.md) for the
  repo-backed and live-cluster view of Longhorn, including current breakage and drift
- [k3s + Kubero + Longhorn Runbook](deployment/k3s-kubero-longhorn.md) for the networking-final cluster rollout
- [Current Project Structure Analysis](analysis/current-project-structure-analysis.md) for a deeper review of the repo layout and tradeoffs

## Assets

- [System Diagram](assets/system-diagram.png)
- [Network Diagram](assets/network-arcitecture.png)
