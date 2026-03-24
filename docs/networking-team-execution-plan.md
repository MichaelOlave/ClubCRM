# Networking Team Execution Plan

## Purpose

This document covers only the two-person network programming workstream for ClubCRM.

It is a companion to the main four-person database team plan in [docs/team-execution-plan.md](/Users/michaelolave/Projects/active/ClubCRM/docs/team-execution-plan.md), not a replacement for it.

## Networking Workstream Goal

Use the existing ClubCRM application as the workload for a deployment and orchestration final focused on:

- `k3s`
- `Longhorn`
- Kubernetes networking
- ingress and service routing
- persistent storage
- deployment reliability

## What This Team Owns

This two-person team owns the deployment layer, not the majority of the database-project feature scope.

Primary deliverables:

- container-ready web and API workloads
- `k3s` deployment manifests or Helm-based setup
- `Longhorn`-backed persistence for required stateful services
- ingress and internal service communication
- a repeatable deployment demo

## What This Team Does Not Own

This two-person plan does not replace ownership of:

- PostgreSQL schema design
- MongoDB form workflow design
- core CRUD feature delivery
- the full four-person application roadmap
- the main database-class MVP definition

Those responsibilities stay with the primary team plan.

## Team Members

- Michael
- Lily

## Working Model

This should be treated as shared networking work with different focus areas, not as one person carrying the full deployment project alone.

Both teammates should contribute to:

- Kubernetes setup and troubleshooting
- deployment testing
- demo rehearsal
- architecture diagrams
- explaining traffic flow and storage behavior

## Responsibility Split

### Michael: Deployment Integration and App Readiness

Responsibilities:

- prepare the existing web and API apps for cluster deployment
- document runtime dependencies, ports, and environment variables
- help build and verify Kubernetes manifests
- help verify that the deployed app still supports the main demo workflow
- support diagrams, screenshots, and the explanation of how app services map into Kubernetes

### Lily: Cluster Networking and Storage Validation

Responsibilities:

- build the `k3s` environment
- configure `Longhorn`
- define storage for required stateful services
- configure ingress, service discovery, and deployment health behavior
- help test and explain cluster behavior during the demo

## Handoff and Collaboration Points

Michael should drive:

- making sure the app is actually ready to deploy
- making sure the deployed environment still supports the class demo flow

Lily should drive:

- making sure the cluster, storage, and routing behavior are reliable
- making sure the networking explanation is technically solid

Shared checkpoints:

- the web and API build successfully as deployable workloads
- the app is reachable through ingress
- required stateful services retain data through `Longhorn`
- both teammates can explain the deployment clearly

## Minimum Networking Demo

The networking final should aim to show:

- the application deployed on `k3s`
- the web app reachable through ingress
- the API reachable through a Kubernetes service
- at least one stateful service using `Longhorn`
- data surviving a pod restart or reschedule

## Suggested Execution Order

1. identify the exact app components that must be deployed for the networking final
2. make sure the web and API can be containerized consistently
3. deploy stateless app workloads to `k3s`
4. attach `Longhorn` storage to required stateful workloads
5. configure ingress and internal service communication
6. rehearse the deployment and recovery demo

## Scope Guardrails

If a task mainly improves the database-class app features, it belongs in the main team plan.

If a task mainly improves deployment, storage, cluster networking, or orchestration, it belongs in this networking plan.

When a task touches both, do the minimum integration needed and keep the ownership boundary explicit.
