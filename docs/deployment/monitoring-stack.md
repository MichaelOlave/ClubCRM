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
- one Mac host running OrbStack for `Server1`, `Server2`, and `Server3`
- optional live kubeconfig on the monitoring host for cluster visibility

Current live deployment as of April 18, 2026:

- monitoring host VM: `DemoControlPlaneServer` at `192.168.139.213`
- dashboard URL: `http://192.168.139.213:3001`
- direct `monitor-web` container URL: `http://192.168.139.213:3002`
- `monitor-api`: `http://192.168.139.213:8010`
- VM-agent reachable monitoring API address from the replacement cluster nodes:
  `http://100.95.238.93:8010`

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
100.122.118.85 clubcrm.local kubero.local
100.122.118.85 Server1 server1
100.67.65.5 Server2 server2
100.99.187.90 Server3 server3
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

Create a dedicated virtual environment for the VM agent and install the optional
dependencies there. This avoids Ubuntu 24.04 `externally-managed-environment`
errors and keeps the service runtime isolated from the base image Python:

```bash
python3 -m venv /opt/clubcrm/infra/monitoring/vm-agent/.venv
/opt/clubcrm/infra/monitoring/vm-agent/.venv/bin/pip install --upgrade pip
/opt/clubcrm/infra/monitoring/vm-agent/.venv/bin/pip install -r infra/monitoring/vm-agent/requirements.txt
```

Install the sample `systemd` unit:

```bash
sudo cp infra/monitoring/vm-agent/monitor-vm-agent.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now monitor-vm-agent
```

The sample service expects an environment file at `/etc/clubcrm-monitor-agent.env`.

Example for `Server1`:

```bash
MONITOR_API_BASE_URL=http://<monitor-host>:8010
MONITOR_AGENT_VM_ID=Server1
MONITOR_AGENT_TOKEN=monitor-agent-server1
MONITOR_AGENT_INTERVAL_SECONDS=1
MONITOR_AGENT_TIMEOUT_SECONDS=2
```

Equivalent live values for the replacement cluster:

```bash
MONITOR_API_BASE_URL=http://100.95.238.93:8010
MONITOR_AGENT_VM_ID=Server1
MONITOR_AGENT_TOKEN=monitor-agent-server1
```

Use the same shape for `Server2` and `Server3` with their matching IDs and tokens.

For local OrbStack rehearsals where the guest VM needs to reach the Mac host directly, this usually
becomes:

```bash
MONITOR_API_BASE_URL=http://host.internal:8010
```

If the guest VM cannot route to `host.internal`, set `MONITOR_API_BASE_URL` to a
directly reachable address for the monitoring host instead.

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

For the live OrbStack control-plane VM:

```bash
curl http://192.168.139.213:8010/health
curl http://192.168.139.213:3001/api/snapshot
```

In the browser, confirm:

- the dashboard loads without WebSocket errors
- VM telemetry appears for `Server1`, `Server2`, and `Server3`
- Kubernetes panels show either live data or snapshot data
- the embedded ClubCRM iframe reaches the expected public route
- a guarded action updates the event timeline
