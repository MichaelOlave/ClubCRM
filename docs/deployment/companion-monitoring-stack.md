# Companion Monitoring Stack Guide

This guide documents the separate cluster visualizer used for the ClubCRM networking demo.

It is intentionally not part of the main ClubCRM product surface. The stack exists so the team can
watch Kubernetes node health, pod placement, and Longhorn volume behavior from outside the cluster
while nodes or pods are being disrupted on purpose.

See [Monitoring Stack Deployment](monitoring-stack.md) for host-level deployment steps and
[k3s + Kubero + Longhorn Runbook](k3s-kubero-longhorn.md) for the cluster-side rollout.

## Why This Stack Exists

- keep the networking demo observable even when the in-cluster app is unstable on purpose
- show current node, pod, and Longhorn state in one live dashboard
- surface pod movement, readiness changes, and storage health events as they happen
- keep v1 focused on visualization instead of destructive control actions

## What It Is Not

- not part of the normal ClubCRM devcontainer workflow
- not the source of truth for ClubCRM business data
- not a replacement for the main `apps/web` and `apps/api` applications
- not a VM, container, or general infrastructure admin console
- not a control plane for powering off nodes or recycling workloads

## Repo Map

- `apps/monitor-api` is the standalone FastAPI cluster-read backend
- `apps/monitor-web` is the standalone Next.js dashboard
- `infra/monitoring/docker-compose.monitoring.yml` deploys the pair on a separate host
- `infra/monitoring/fixtures/k8s-snapshot.json` is the repeatable offline fixture for rehearsals

## Runtime Architecture

```text
browser
   |
   v
monitor-web (nginx)
   |
   +--> monitor-app (Next.js)
   |
   +--> monitor-api
   | \
   |  \--> mounted kubeconfig
   |
   +--> optional offline fixture file
```

The stack keeps a single in-memory cluster view. `monitor-api` sends the initial snapshot over HTTP
and WebSocket, then broadcasts snapshot heartbeats plus event frames as watch updates arrive.

## `monitor-api` Responsibilities

At startup `apps/monitor-api` can:

- load an initial fixture from `MONITOR_CLUSTER_SNAPSHOT_FILE`
- connect to Kubernetes with `MONITOR_CLUSTER_KUBECONFIG` or in-cluster auth
- watch Kubernetes nodes and pods through the official Kubernetes client
- watch Longhorn volumes and replicas when `MONITOR_LONGHORN_ENABLED=true`
- normalize those inputs into a consistent snapshot plus event stream
- protect viewer access with `MONITOR_ADMIN_TOKEN` when `CLUSTER_VIEWER_PUBLIC=false`

Its live API surface is:

- `GET /health`
- `GET /api/snapshot`
- `GET /api/events`
- `GET /api/replay`
- `WS /ws/stream`

The live snapshot currently includes root-level fields:

- `type`
- `ts`
- `nodes`
- `pods`
- `volumes`
- `replicas`
- `probes`

`nodes` and `pods` are the Phase 1 visualizer contract. `volumes` and `replicas` are the initial
Longhorn visibility layer; they track attachment node, workload correlation, robustness, health,
replica placement, and replica health. `probes` captures monitored ClubCRM service availability,
latency, and recent failures.

## `monitor-web` Responsibilities

`apps/monitor-web` is a standalone dashboard, not an extension of the main `apps/web` app.

It is responsible for:

- fetching the first snapshot on the server
- preloading the most recent in-memory event buffer before the WebSocket connects
- connecting browsers to `WS /ws/stream`
- rendering the cluster graph, pod placement, Longhorn storage panel, and recent event feed
- showing whether the stream is live, reconnecting, or offline

## Environment Reference

Most defaults live in `.env.example`.

| Group            | Key variables                                                                                                                                              | Purpose                                                             |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| API              | `MONITOR_API_TITLE`, `MONITOR_API_HOST`, `MONITOR_API_PORT`, `MONITOR_API_BASE_URL`                                                                        | configure the FastAPI service                                       |
| Viewer access    | `MONITOR_ADMIN_TOKEN`, `CLUSTER_VIEWER_PUBLIC`                                                                                                             | optionally require a bearer token for snapshot and dashboard access |
| Cluster input    | `MONITOR_CLUSTER_KUBECONFIG`, `MONITOR_CLUSTER_CONTEXT`, `MONITOR_CLUSTER_IN_CLUSTER`                                                                      | choose how `monitor-api` connects to Kubernetes                     |
| Longhorn         | `MONITOR_LONGHORN_ENABLED`                                                                                                                                 | enable or disable Longhorn CRD watches                              |
| Event causes     | `MONITOR_K8S_EVENTS_ENABLED`, `MONITOR_CHAOS_ENABLED`                                                                                                      | watch Kubernetes warning events and Chaos Mesh resources            |
| Fallback fixture | `MONITOR_CLUSTER_SNAPSHOT_FILE`                                                                                                                            | preload a snapshot when live access is unavailable                  |
| Replay capture   | `MONITOR_CLUSTER_RECORDING_FILE`, `MONITOR_REPLAY_MODE`, `MONITOR_REPLAY_API_URL`, `NEXT_PUBLIC_MONITOR_REPLAY_MODE`, `NEXT_PUBLIC_MONITOR_REPLAY_API_URL` | record live sessions and switch the dashboard into replay mode      |
| Service probes   | `MONITOR_PROBE_TARGETS`, `MONITOR_PROBE_INTERVAL_SECONDS`, `MONITOR_PROBE_TIMEOUT_SECONDS`, `MONITOR_PROBE_DEGRADED_LATENCY_MS`                            | probe application URLs and surface continuity status                |
| Runtime tuning   | `MONITOR_CLUSTER_HEARTBEAT_SECONDS`, `MONITOR_CLUSTER_WATCH_TIMEOUT_SECONDS`, `MONITOR_DISABLE_BACKGROUND_TASKS`                                           | tune the watch, heartbeat, and background-loop behavior             |
| Frontend         | `MONITOR_WEB_PORT`, `NEXT_PUBLIC_MONITOR_API_BASE_URL`, `NEXT_PUBLIC_MONITOR_WS_URL`                                                                       | configure how browsers reach the API and dashboard                  |

In the default Compose deployment, `monitor-app` is not published directly. A lightweight reverse
proxy publishes `MONITOR_WEB_PORT` and forwards:

- `/` to `monitor-app`
- `/monitor-api/*` to `monitor-api`
- `/health` to `monitor-api`
- `/ws/stream` and `/monitor-api/ws/stream` to `monitor-api`

That keeps the dashboard on a single browser origin and prevents HTTPS pages from trying to open a
`wss://` connection against a plain `ws://` backend port.

## Deployment Modes

### Live Kubeconfig Mode

Use this for the real demo shape.

- `monitor-api` and `monitor-web` run off-cluster on a separate host
- the monitoring host mounts a kubeconfig into `monitor-api`
- node and pod watches start automatically
- Longhorn watches start automatically unless `MONITOR_LONGHORN_ENABLED=false`
- optional HTTP probes can target the live ClubCRM web or API URLs to prove traffic continuity

### Snapshot Fixture Mode

Use this for UI work and rehearsal when cluster access is not ready yet.

- point `MONITOR_CLUSTER_SNAPSHOT_FILE` at the checked-in fixture or another captured snapshot
- keep the dashboard shape stable during frontend work
- skip live Kubernetes and Longhorn watches until kubeconfig access is available

## Troubleshooting

- Dashboard loads but stays empty:
  Check `MONITOR_API_BASE_URL`, `NEXT_PUBLIC_MONITOR_API_BASE_URL`, and
  `NEXT_PUBLIC_MONITOR_WS_URL`.

- Snapshot returns empty state in live mode:
  Check `MONITOR_CLUSTER_KUBECONFIG`, `MONITOR_CLUSTER_CONTEXT`, and the mounted kubeconfig file.

- Longhorn fields stay empty while nodes and pods work:
  Confirm the Longhorn CRDs exist in the target cluster and that `MONITOR_LONGHORN_ENABLED=true`.
  Set `MONITOR_LONGHORN_ENABLED=false` when the target cluster does not have Longhorn installed.

- Live cluster access is not ready yet:
  Set `MONITOR_CLUSTER_SNAPSHOT_FILE` to a readable JSON file that matches the live snapshot shape.

- History disappears after a restart:
  That is expected in v1 because `monitor-api` stores cluster state and recent events in memory.
