# Monitoring Stack Deployment

This document covers how to deploy the companion cluster visualizer for the ClubCRM networking demo.

For the higher-level architecture and data-flow model, start with
[Companion Monitoring Stack Guide](companion-monitoring-stack.md).

## Deployment Goal

The monitoring stack should stay available even while the main demo cluster is being disrupted on
purpose.

That means the deployment shape is intentionally separate from the main ClubCRM app pair:

- `monitor-api` and `monitor-web` run on their own host
- `monitor-api` reaches Kubernetes through a mounted kubeconfig or a checked-in snapshot file
- browsers reach the dashboard through `monitor-web`
- the browser WebSocket connects directly to `monitor-api` unless an external proxy is configured
- a checked-in JSON fixture remains available for rehearsal and fallback

## Required Repo Assets

- `apps/monitor-api`
- `apps/monitor-web`
- `infra/monitoring/docker-compose.monitoring.yml`
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

The root `dev:monitor-api:live`, `dev:monitor-web:live`, and `dev:monitor:live` scripts remain as
operator conveniences for loading live-demo env files. They are not required for fixture mode or
for the Compose deployment below.

## Host Placement

The preferred live-demo shape is:

- one separate monitoring host for `monitor-api` and `monitor-web`
- the `k3s` cluster continues to run on `Server1`, `Server2`, and `Server3`
- the monitoring host mounts a kubeconfig with read access to cluster nodes, pods, and Longhorn
  custom resources
- the dashboard stays reachable from the presentation machine even if cluster nodes are changing

Current host mapping for the networking environment:

- `Server1` -> `100.122.118.85`
- `Server2` -> `100.67.65.5`
- `Server3` -> `100.99.187.90`
- `DemoControlPlaneServer` -> `192.168.139.213`

The monitoring host needs:

- Docker and Docker Compose
- the repo checkout or copied deployment assets
- a kubeconfig file with read access to the cluster

## Standalone Compose Deployment

Bring the monitoring stack up with:

```bash
docker compose --env-file .env -f infra/monitoring/docker-compose.monitoring.yml up -d --build
```

The Compose file loads container defaults from `.env.example` and then overlays `.env` when
present. Pass `--env-file .env` from the repository root so Compose interpolation also sees live
host paths such as `MONITOR_CLUSTER_KUBECONFIG_HOST_PATH`.

By default it runs:

- `monitor-api` on `8010`
- `monitor-web` on `3001`

The compose deployment starts in fixture mode when no live kubeconfig values are provided. For a
live monitoring host, override these values so `monitor-api` mounts and reads a real kubeconfig.
Set `MONITOR_CLUSTER_SNAPSHOT_FILE=` to an intentionally blank value to disable fixture mode:

- `MONITOR_CLUSTER_KUBECONFIG_HOST_PATH`
- `MONITOR_CLUSTER_KUBECONFIG`
- `MONITOR_CLUSTER_CONTEXT`
- `MONITOR_CLUSTER_IN_CLUSTER`
- `MONITOR_CLUSTER_SNAPSHOT_FILE`
- `MONITOR_LONGHORN_ENABLED`

Useful frontend overrides include:

- `NEXT_PUBLIC_MONITOR_API_BASE_URL`
- `NEXT_PUBLIC_MONITOR_WS_URL`
- `MONITOR_WEB_PORT`

## Recommended Environment Values

For a live kubeconfig-mounted deployment:

```dotenv
MONITOR_API_PORT=8010
MONITOR_WEB_PORT=3001
MONITOR_ADMIN_TOKEN=monitor-admin-token
CLUSTER_VIEWER_PUBLIC=true
MONITOR_CLUSTER_KUBECONFIG_HOST_PATH=/absolute/path/to/kubeconfig
MONITOR_CLUSTER_KUBECONFIG=/etc/clubcrm-monitor/kubeconfig
MONITOR_CLUSTER_CONTEXT=
MONITOR_CLUSTER_IN_CLUSTER=false
MONITOR_CLUSTER_SNAPSHOT_FILE=
MONITOR_CLUSTER_RECORDING_FILE=/var/lib/clubcrm-monitor/cluster-session.jsonl
MONITOR_LONGHORN_ENABLED=true
MONITOR_CLUSTER_HEARTBEAT_SECONDS=5
MONITOR_CLUSTER_WATCH_TIMEOUT_SECONDS=300
MONITOR_PROBE_TARGETS=clubcrm-web=https://clubcrm.local/login,clubcrm-api=https://clubcrm.local/api/health
MONITOR_PROBE_INTERVAL_SECONDS=5
MONITOR_PROBE_TIMEOUT_SECONDS=2
MONITOR_PROBE_DEGRADED_LATENCY_MS=1200
MONITOR_REPLAY_MODE=false
NEXT_PUBLIC_MONITOR_API_BASE_URL=http://192.168.139.213:8010
NEXT_PUBLIC_MONITOR_WS_URL=ws://192.168.139.213:8010/ws/stream
```

For offline rehearsal or frontend work without live cluster access:

```dotenv
MONITOR_CLUSTER_KUBECONFIG=
MONITOR_CLUSTER_SNAPSHOT_FILE=/workspace/infra/monitoring/fixtures/k8s-snapshot.json
MONITOR_REPLAY_MODE=true
```

The container image also includes the checked-in fixture at
`/app/infra/monitoring/fixtures/k8s-snapshot.json`, which is the Compose default only when
`MONITOR_CLUSTER_SNAPSHOT_FILE` is unset.

## Snapshot Fixture

`infra/monitoring/fixtures/k8s-snapshot.json` should match the live API shape:

- root `type`
- root `ts`
- root `nodes`
- root `pods`
- root `volumes`
- root `replicas`

The `volumes` collection represents Longhorn volume state, including PVC and workload correlation,
attachment node, state, robustness, and health. The `replicas` collection represents Longhorn
replica placement and health per volume.

Keep fixture captures aligned to that root-level shape so `monitor-api` can load them directly.

## Verification

From the monitoring host, verify the deployment with:

```bash
curl http://localhost:8010/health
curl http://localhost:8010/api/snapshot
curl http://localhost:3001
```

For the live monitoring host at `192.168.139.213`:

```bash
curl http://192.168.139.213:8010/health
curl http://192.168.139.213:8010/api/snapshot
curl http://192.168.139.213:3001
```

In the browser, confirm:

- the dashboard loads without errors
- the cluster graph renders nodes and scheduled pods
- the Longhorn panel shows fixture or live `volumes` and `replicas` when available
- recent node, pod, volume, or replica events appear in the event feed
- the browser connects to `NEXT_PUBLIC_MONITOR_WS_URL`
