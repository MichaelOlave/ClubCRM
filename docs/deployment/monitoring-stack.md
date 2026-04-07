# Monitoring Stack Deployment

This document covers how to deploy the companion monitoring and control stack for the ClubCRM
networking demo.

For the higher-level architecture, data flow, and API/control model, start with
[Companion Monitoring Stack Guide](companion-monitoring-stack.md).

## Deployment Goal

The monitoring stack should stay available even while the main demo VMs, pods, or storage-backed
services are being disrupted on purpose.

That means the deployment shape is intentionally separate from the main ClubCRM app pair:

- `monitor-api` and `monitor-web` run on their own host
- OrbStack power control is reached either locally or through a restricted SSH wrapper
- Kubernetes visibility comes from `kubectl` or a snapshot file
- guest agents run inside the demo VMs for CPU, memory, and container telemetry

## Required Repo Assets

- `apps/monitor-api`
- `apps/monitor-web`
- `infra/monitoring/docker-compose.monitoring.yml`
- `infra/monitoring/orbstack/clubcrm-monitor-orbstack.sh`
- `infra/monitoring/vm-agent/monitor_vm_agent.py`
- `infra/monitoring/vm-agent/monitor-vm-agent.service`
- `infra/monitoring/fixtures/k8s-snapshot.json`

## Local Development

Bootstrap only the monitoring stack:

```bash
pnpm bootstrap:monitoring
```

Run both apps together:

```bash
pnpm dev:monitor
```

Run the focused monitoring verification flow:

```bash
pnpm verify:monitoring
```

These commands are intentionally separate from the default ClubCRM `pnpm dev`, `pnpm build`, and
`pnpm verify` flows.

## Host Placement

The preferred live-demo shape is:

- one separate monitoring host for `monitor-api` and `monitor-web`
- one Mac host running OrbStack for `vm1`, `vm2`, and `vm3`
- optional live kubeconfig on the monitoring host for cluster visibility

The monitoring host needs:

- Docker and Docker Compose
- the repo checkout or copied deployment assets
- either local `orbctl` access or SSH access to the OrbStack wrapper
- either `kubectl` access to the cluster or a mounted JSON snapshot file

## Standalone Compose Deployment

Bring the monitoring stack up with:

```bash
docker compose -f infra/monitoring/docker-compose.monitoring.yml up -d --build
```

The Compose file loads defaults from `.env.example` and then overlays `.env` when present.

By default it runs:

- `monitor-api` on `8010`
- `monitor-web` on `3001`

Useful deployment overrides include:

- `MONITOR_API_IMAGE`
- `MONITOR_WEB_IMAGE`
- `MONITOR_API_PORT`
- `MONITOR_WEB_PORT`
- `NEXT_PUBLIC_MONITOR_API_BASE_URL`
- `NEXT_PUBLIC_MONITOR_WS_URL`

## Live Demo Environment Values

For the networking final, point the synthetic monitor and embedded iframe at the shared ingress
host instead of local development ports:

```bash
MONITOR_SYNTHETIC_TARGET_URL=http://clubcrm.local/system/health
NEXT_PUBLIC_CLUBCRM_DEMO_URL=http://clubcrm.local/demo/failover
```

Add matching host entries on the monitoring host and the presenter machine:

```text
<vm1-private-ip> clubcrm.local kubero.local
```

With that iframe target in place, the monitoring dashboard can keep the ClubCRM diagnostics page
visible while you recycle the active web pod.

## OrbStack Control Path

The monitoring API does not run arbitrary shell from the UI.

When `monitor-api` runs on the same Mac host as OrbStack, it talks to `orbctl` directly.

When `monitor-api` runs on a separate monitoring host, it SSHes into a dedicated user on the Mac
host and calls the wrapper script with the narrow command surface below:

- `list`
- `power start <machine>`
- `power stop <machine>`
- `power restart <machine>`

Install the sample wrapper from:

- [`infra/monitoring/orbstack/clubcrm-monitor-orbstack.sh`](../../infra/monitoring/orbstack/clubcrm-monitor-orbstack.sh)

Relevant OrbStack command references:

- [OrbStack headless CLI usage](https://docs.orbstack.dev/headless)
- [OrbStack Linux machine commands](https://docs.orbstack.dev/machines/commands)

If the deployment host's OrbStack release formats `orb info` differently, update the wrapper
parsing logic rather than widening the monitoring API's command surface.

## VM Agent Installation

Each demo VM can run the lightweight guest agent from:

- [`infra/monitoring/vm-agent/monitor_vm_agent.py`](../../infra/monitoring/vm-agent/monitor_vm_agent.py)

The agent:

- sends CPU, memory, and container telemetry to `POST /api/agents/{vm_id}/heartbeat`
- receives queued container commands back in the heartbeat response
- executes `start`, `stop`, and `restart` for containers through the Docker SDK when available,
  and falls back to the Docker CLI when only the CLI is present
- reports command results on the next heartbeat

Install optional dependencies for richer Docker and system telemetry:

```bash
python3 -m pip install -r infra/monitoring/vm-agent/requirements.txt
```

Install the sample `systemd` unit:

```bash
sudo cp infra/monitoring/vm-agent/monitor-vm-agent.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now monitor-vm-agent
```

The sample service expects an environment file at `/etc/clubcrm-monitor-agent.env`.

Example for `vm1`:

```bash
MONITOR_API_BASE_URL=http://<monitor-host>:8010
MONITOR_AGENT_VM_ID=vm1
MONITOR_AGENT_TOKEN=monitor-agent-vm1
MONITOR_AGENT_INTERVAL_SECONDS=1
MONITOR_AGENT_TIMEOUT_SECONDS=2
```

For local OrbStack rehearsals where the guest VM needs to reach the Mac host directly, this usually
becomes:

```bash
MONITOR_API_BASE_URL=http://host.internal:8010
```

## Kubernetes Inputs

The monitoring API supports two Kubernetes input paths:

1. live `kubectl` on the monitoring host
2. a snapshot file defined by `MONITOR_K8S_SNAPSHOT_FILE`

With live `kubectl` access, the monitoring snapshot includes:

- nodes
- pods
- storage classes
- PVC status merged with PV status
- Longhorn volume state from `volumes.longhorn.io`

A sample file lives at:

- [`infra/monitoring/fixtures/k8s-snapshot.json`](../../infra/monitoring/fixtures/k8s-snapshot.json)

Use snapshot mode when you want repeatable UI demos before the live cluster feed is ready.

## Verification

From the monitoring host, verify the deployment with:

```bash
curl http://localhost:8010/health
curl http://localhost:8010/api/snapshot
curl http://localhost:3001/api/snapshot
```

In the browser, confirm:

- the dashboard loads without WebSocket errors
- VM telemetry appears for `vm1`, `vm2`, and `vm3`
- Kubernetes panels show either live data or snapshot data
- the embedded ClubCRM iframe reaches the expected public route
- a guarded action updates the event timeline
