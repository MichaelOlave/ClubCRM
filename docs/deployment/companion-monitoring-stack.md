# Companion Monitoring Stack Guide

This guide documents the separate monitoring and control plane used for the ClubCRM networking demo.

It is intentionally not part of the main ClubCRM product surface. The companion stack exists so the
team can keep a live dashboard available while demo VMs, pods, or storage-backed workloads are
stopped, restarted, or rescheduled.

See [Monitoring Stack Deployment](monitoring-stack.md) for the host-level deployment steps and
[k3s + Kubero + Longhorn Runbook](k3s-kubero-longhorn.md) for the cluster-side rollout.

## Why This Stack Exists

- keep the networking demo observable even when the main app is unstable on purpose
- provide one place to watch VM telemetry, container state, pod state, PVC state, and Longhorn
  health
- give the presenters guarded VM, container, and pod controls without exposing arbitrary shell
- embed the live ClubCRM failover page so the audience can see routing behavior change in real time

## What It Is Not

- not part of the normal ClubCRM devcontainer workflow
- not the source of truth for ClubCRM business data
- not a replacement for the main `apps/web` and `apps/api` applications
- not a generic infrastructure admin console

## Repo Map

- `apps/monitor-api` is the FastAPI control plane
- `apps/monitor-web` is the standalone Next.js dashboard
- `infra/monitoring/docker-compose.monitoring.yml` deploys the pair on a separate host
- `infra/monitoring/orbstack/clubcrm-monitor-orbstack.sh` is the narrow OrbStack wrapper for
  remote power control
- `infra/monitoring/vm-agent/` contains the guest agent, optional dependencies, and sample
  `systemd` unit
- `infra/monitoring/fixtures/k8s-snapshot.json` is the repeatable snapshot input for offline or
  pre-demo rehearsals

## Runtime Architecture

```text
demo browser
    |
    v
monitor-web  ------------------------------> embedded ClubCRM demo URL
    |                                                   |
    | initial snapshot + control proxies                | live app surface
    v                                                   v
monitor-api -----------------------------> synthetic HTTP check target
    |                  \
    |                   \--> kubectl or snapshot file
    |
    +--> OrbStack local CLI or SSH wrapper
    |
    +<-- VM agent heartbeats from Server1/Server2/Server3
```

The monitoring stack keeps a single in-memory view of the demo environment and rebroadcasts that
view to connected browsers once per second.

Current live deployment note:

- the dashboard host is `DemoControlPlaneServer` at `192.168.139.213`
- `monitor-api` is live on `:8010`
- the dashboard is served on `:3001`
- the direct `monitor-web` container is exposed on `:3002`
- live VM agent IDs are `Server1`, `Server2`, and `Server3`

## `monitor-api` Responsibilities

`apps/monitor-api` owns the monitoring state and all runtime polling loops.

It starts these background tasks during FastAPI startup unless
`MONITOR_DISABLE_BACKGROUND_TASKS=true`:

- synthetic HTTP checks against the configured ClubCRM target
- Kubernetes polling through `kubectl` or a snapshot file
- OrbStack VM power-state polling
- WebSocket snapshot broadcasts every second

It also exposes the monitoring API surface:

- `GET /health`
- `GET /api/snapshot`
- `POST /api/agents/{vm_id}/heartbeat`
- `POST /api/control/vms/{vm_id}/power`
- `POST /api/control/containers/{vm_id}/{container_name}`
- `POST /api/control/k8s/pods/{namespace}/{pod_name}/recycle`
- `WS /ws/stream`

The API keeps history and the event timeline in memory in v1, so restarting `monitor-api` resets
the rolling charts and recent events.

## `monitor-web` Responsibilities

`apps/monitor-web` is a standalone dashboard, not an extension of the main `apps/web` app.

It is responsible for:

- fetching the first monitoring snapshot on the server
- connecting to the live WebSocket stream in the browser
- rendering panels for VM health, Docker/container state, Kubernetes state, storage, latency, and
  the event timeline
- proxying destructive actions through internal Next.js route handlers that attach
  `MONITOR_ADMIN_TOKEN` server-side before forwarding to `monitor-api`
- resolving the embedded ClubCRM iframe target, preferring `/demo/failover` and falling back to
  `/system/health` when needed

## Data Sources And Control Paths

### 1. VM Agent Heartbeats

Each demo VM can run `infra/monitoring/vm-agent/monitor_vm_agent.py`.

On every loop, the agent:

- collects CPU and memory utilization
- collects Docker container state, using the Docker SDK when present and falling back to the Docker
  CLI when needed
- posts that data to `POST /api/agents/{vm_id}/heartbeat`
- receives queued container commands in the heartbeat response
- executes those commands locally
- reports command results on the next heartbeat

This is how container-level actions are kept narrow and auditable: the control plane queues a named
action, and the agent executes only the command type it already understands.

In the current live deployment, the replacement cluster nodes post to:

```text
http://100.95.238.93:8010
```

That address is used because the replacement servers could not route to `host.internal` in the
live environment.

### 2. Synthetic Health Checks

`monitor-api` sends repeated HTTP requests to `MONITOR_SYNTHETIC_TARGET_URL` to answer the simple
question, "Is the ClubCRM app reachable right now?"

For local development the default target is `http://localhost:8000/health`. For the live
networking demo it should be changed to `http://clubcrm.local/system/health` so the synthetic path
travels through ingress and the public web surface.

### 3. Kubernetes Visibility

The monitoring API supports two Kubernetes input modes:

1. live `kubectl` access from the monitoring host
2. a JSON file defined by `MONITOR_K8S_SNAPSHOT_FILE`

When Kubernetes data is available, the monitoring snapshot includes:

- nodes
- pods across all namespaces
- storage classes
- PVC state merged with backing PV state
- Longhorn volume state from `volumes.longhorn.io`

Snapshot-file mode is useful when the UI needs to be stable before kubeconfig or live cluster access
is ready.

### 4. OrbStack VM Power Control

The monitoring API does not expose arbitrary remote shell access.

Instead, VM power control follows one of two narrow paths:

- local mode: call `orbctl` directly on the monitoring host
- remote mode: SSH to a dedicated user and invoke
  `infra/monitoring/orbstack/clubcrm-monitor-orbstack.sh`

The wrapper intentionally limits the command surface to:

- `list`
- `power start <machine>`
- `power stop <machine>`
- `power restart <machine>`

### 5. Browser Control Flow

The browser talks to `monitor-web`, not directly to `monitor-api`, for destructive actions.

That keeps the admin token on the server side:

1. the user clicks a guarded action in the dashboard
2. `monitor-web` posts to its own internal `/api/control/...` route
3. that route forwards the request to `monitor-api` with `Authorization: Bearer <admin token>`
4. `monitor-api` either executes the action immediately or queues it for the VM agent
5. the result appears back in the snapshot stream and event timeline

## Local Commands

Run these from the repository root:

```bash
pnpm bootstrap:monitoring
pnpm dev:monitor
pnpm dev:monitor-api
pnpm dev:monitor-web
pnpm verify:monitoring
```

Focused commands also exist for linting, tests, API checks, and the monitor-web production build.
Those scripts are intentionally separate from the main ClubCRM `pnpm dev`, `pnpm build`, and
`pnpm verify` flows.

## Environment Reference

Most monitoring defaults live in `.env.example`, while deployment-oriented overrides live in
`.env.production.example`.

| Group                 | Key variables                                                                                                                                                                                                        | Purpose                                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| API and web addresses | `MONITOR_API_PORT`, `MONITOR_API_BASE_URL`, `NEXT_PUBLIC_MONITOR_API_BASE_URL`, `NEXT_PUBLIC_MONITOR_WS_URL`, `MONITOR_WEB_PORT`                                                                                     | control where `monitor-api` listens, where `monitor-web` reaches it, and which WebSocket URL browsers use |
| Auth                  | `MONITOR_ADMIN_TOKEN`, `MONITOR_AGENT_TOKENS`, `MONITOR_TARGET_VMS`                                                                                                                                                  | separate admin controls from per-VM agent authentication                                                  |
| Synthetic monitoring  | `MONITOR_SYNTHETIC_TARGET_URL`, `MONITOR_SYNTHETIC_INTERVAL_SECONDS`, `MONITOR_SYNTHETIC_TIMEOUT_SECONDS`, `MONITOR_HISTORY_LIMIT`, `MONITOR_EVENT_LIMIT`, `MONITOR_STALE_AFTER_SECONDS`, `MONITOR_LATENCY_SPIKE_MS` | tune the synthetic health loop and dashboard history windows                                              |
| OrbStack control      | `MONITOR_ORBSTACK_SSH_HOST`, `MONITOR_ORBSTACK_SSH_USER`, `MONITOR_ORBSTACK_SSH_PORT`, `MONITOR_ORBSTACK_SSH_IDENTITY_FILE`, `MONITOR_ORBSTACK_REMOTE_WRAPPER`, `MONITOR_ORBSTACK_POLL_INTERVAL_SECONDS`             | switch between local `orbctl` mode and remote-wrapper mode                                                |
| Kubernetes and iframe | `MONITOR_K8S_SNAPSHOT_FILE`, `MONITOR_K8S_POLL_INTERVAL_SECONDS`, `NEXT_PUBLIC_CLUBCRM_DEMO_URL`, `CLUBCRM_DEMO_URL`                                                                                                 | control how Kubernetes data is sourced and which ClubCRM page is embedded                                 |

## Deployment Modes

### Same Mac Host As OrbStack

Use this when `monitor-api` runs on the same machine that already has `orbctl`.

- simplest control path
- no SSH wrapper required
- good for local rehearsal on the OrbStack host

### Separate Monitoring VM

Use this for the actual networking demo shape.

- `monitor-api` and `monitor-web` run on a host that stays alive even while cluster VMs are cycled
- the monitoring host reaches OrbStack through the restricted SSH wrapper
- the monitoring host also holds `kubectl` access to the cluster or a mounted snapshot file

### Snapshot-Driven Mode

Use this when live kubeconfig is not ready yet.

- point `MONITOR_K8S_SNAPSHOT_FILE` at the sample or generated JSON snapshot
- keep the dashboard shape stable for UI rehearsals
- swap to live `kubectl` later without changing the dashboard surface

## Operator Checklist

- start `monitor-api` and `monitor-web`
- confirm `GET /health` and `GET /api/snapshot` respond
- confirm all target VMs are present in `MONITOR_TARGET_VMS`
- confirm guest agents are heartbeating and container state is visible
- confirm `kubectl` or snapshot-file data is appearing in the Kubernetes panels
- set `MONITOR_SYNTHETIC_TARGET_URL` and `NEXT_PUBLIC_CLUBCRM_DEMO_URL` for the live environment
- rehearse one VM power action, one container restart, and one pod recycle
- remember that restarting `monitor-api` clears in-memory history by design

## Troubleshooting

- Dashboard loads but stays empty:
  Check `MONITOR_API_BASE_URL`, `NEXT_PUBLIC_MONITOR_API_BASE_URL`, and
  `NEXT_PUBLIC_MONITOR_WS_URL`.

- VM tiles never update:
  Check the guest-agent environment file, `MONITOR_AGENT_VM_ID`, `MONITOR_AGENT_TOKEN`, and reachability
  to `MONITOR_API_BASE_URL`.

- The dashboard shows fresh VM heartbeats but the embedded ClubCRM page still points at the retired
  cluster:
  Update `/etc/hosts` on `DemoControlPlaneServer` so `clubcrm.local` and `kubero.local` point to
  `100.122.118.85`.

- Power controls fail:
  Check whether the monitoring host has local `orbctl` access or a valid SSH path to the wrapper.

- Kubernetes panels show no data:
  Install `kubectl` with cluster access or set `MONITOR_K8S_SNAPSHOT_FILE` to a readable JSON file.

- The embedded ClubCRM page points to the wrong route:
  Set `NEXT_PUBLIC_CLUBCRM_DEMO_URL` explicitly. The dashboard will try `/demo/failover` first and
  then `/system/health`.

- History disappears after a restart:
  That is expected in v1 because `monitor-api` stores snapshot history in memory only.
