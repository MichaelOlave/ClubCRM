# Architecture Decision Record

## Current Decisions

### ADR-001: Use a modular monolith for MVP

- Status: accepted
- Decision: keep one backend and one frontend application instead of splitting into microservices.
- Rationale: the team gets clear module boundaries without paying the cost of distributed infrastructure during the MVP.

### ADR-002: Use FastAPI for the backend

- Status: accepted
- Decision: implement the API in FastAPI.
- Rationale: it is a good fit for CRUD-heavy backend work, validation, and rapid iteration in Python.

### ADR-003: Use Next.js for the frontend

- Status: accepted
- Decision: build the admin-facing UI in Next.js.
- Rationale: it gives the team a straightforward web application stack for dashboard and CRUD workflows.

### ADR-004: Use PostgreSQL as the system of record

- Status: accepted
- Decision: store core business entities in PostgreSQL.
- Rationale: organizations, clubs, members, memberships, events, announcements, and roles require relational integrity and constraints.

### ADR-005: Use MongoDB for raw form submissions

- Status: accepted
- Decision: store flexible form payloads in MongoDB.
- Rationale: join requests, RSVPs, interest forms, and feedback can vary by club and form type.

### ADR-006: Use Redis for cache and short-lived data

- Status: accepted
- Decision: use Redis for dashboard caches and other temporary lookups.
- Rationale: repeated read paths should be fast, disposable, and separate from the primary data model.

### ADR-007: Include Kafka in the local stack for observable async workflows

- Status: accepted
- Decision: run Kafka in the standard local environment for observable asynchronous workflows, but keep it out of the core correctness path.
- Rationale: the team can demonstrate event-driven behavior consistently without making CRUD flows depend on Kafka availability.

### ADR-008: Keep authenticated users limited to admins and managers

- Status: accepted
- Decision: only organization admins and club managers log into the system.
- Rationale: this reduces scope while still supporting realistic club-management workflows.

### ADR-009: Model members at the organization level

- Status: accepted
- Decision: a member exists once per organization and can belong to multiple clubs.
- Rationale: this avoids duplicate member records and supports cross-club participation cleanly.

### ADR-010: Standard local development uses the repository devcontainer

- Status: accepted
- Decision: standard development happens in the repository devcontainer, which uses `infra/docker-compose.yml`, `.devcontainer/docker-compose.devcontainer.yml`, and a generated `.devcontainer/docker-compose.ports.yml` to bring up the workspace, app services, and supporting infrastructure.
- Rationale: the team needs one repeatable local setup for frontend, backend, and all supporting data services, and the devcontainer makes that workflow the default for every contributor.

### ADR-011: All three k3s nodes are treated as equal — no nodeAffinity restrictions

- Status: accepted
- Decision: no workload in the cluster sets `nodeAffinity` or `nodeSelector` to prefer or require specific nodes. Spreading is achieved exclusively through `podAntiAffinity` rules.
- Rationale: all three control-plane nodes (server1, server2, server3) have identical hardware and roles. Pinning workloads to a subset of nodes creates artificial single points of failure — draining the pinned node takes down everything that was restricted to it. Using only `podAntiAffinity` with `topologyKey: kubernetes.io/hostname` achieves the same spread guarantee while letting the scheduler use any available node during a drain.
- Implementation: `requiredDuringSchedulingIgnoredDuringExecution` podAntiAffinity on `cloudflared-tunnel`, `clubcrm-api`, `clubcrm-web`, and Traefik. The `required` form guarantees that two replicas of the same workload never land on the same node, which is stronger than `preferred` for demo resilience.

### ADR-012: cloudflared preStop lifecycle hook for clean QUIC connection teardown

- Status: accepted
- Decision: the `cloudflared-tunnel` Deployment sets a `preStop` lifecycle hook (`exec: sleep 5`) on the `cloudflared` container.
- Rationale: Cloudflare's edge uses QUIC (UDP-based) to maintain persistent connections to `cloudflared` connectors. When a pod is evicted without cleanly closing those connections, Cloudflare's edge does not immediately detect the connector is gone and continues routing new requests to it — resulting in 502 errors that persist for up to 30 minutes even though a healthy second connector is available. The 5-second `preStop` sleep gives `cloudflared` time to drain and close QUIC connections before Kubernetes sends SIGTERM, signaling the edge to immediately fail over to the surviving replica. The `terminationGracePeriodSeconds: 30` on the pod gives the full signal-to-exit window.
- Alternative considered: running a single `cloudflared` replica. A single replica is immune to the routing confusion bug (no ambiguity about which connector to use) but is itself a single point of failure — draining its node takes down public internet access until the new pod is scheduled and the tunnel reconnects (~30s). Two replicas with a preStop hook provides both high availability and clean failover.

### ADR-013: Traefik scaled to 2 replicas via HelmChartConfig

- Status: accepted
- Decision: Traefik is configured to run as 2 replicas through a `HelmChartConfig` resource (`infra/k8s/overlays/orbstack-demo/traefik-helm-chart-config.yaml`) rather than directly patching the Traefik Deployment.
- Rationale: k3s manages Traefik through an embedded Helm operator. Direct patches to the `traefik` Deployment in `kube-system` are overwritten on every k3s upgrade or Traefik reconciliation. The `HelmChartConfig` resource is the k3s-native way to persist Helm value overrides that survive upgrades. The config also adds `podAntiAffinity` and a `PodDisruptionBudget (minAvailable: 1)` so that draining any single node always leaves at least one Traefik replica running.

### ADR-014: Never apply overlay Deployment files directly with kubectl apply

- Status: accepted
- Decision: `infra/k8s/overlays/orbstack-demo/clubcrm-api-deployment.yaml` and `clubcrm-web-deployment.yaml` must never be applied directly with `kubectl apply` against the live cluster.
- Rationale: these overlay files use placeholder image tags (`clubcrm-api:deploy`, `clubcrm-web:deploy`) that CI/CD rewrites at deploy time with the actual SHA-tagged GHCR image. Applying the files manually triggers a rolling update to the placeholder tags, causing `ImagePullBackOff` on every pod because those tags do not exist in the registry. Live cluster changes to affinity or probes must be made with `kubectl patch --type=strategic` (which merges correctly) or `kubectl patch --type=json` (for removals), always including the correct SHA-tagged image in any patch that touches the containers array.
