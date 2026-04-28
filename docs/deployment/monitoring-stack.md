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
- the browser reaches `monitor-api` through the dashboard's same-origin proxy by default
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

- `Server1` -> `100.122.118.85` (LAN: 10.10.10.102)
- `Server2` -> `100.67.65.5` (LAN: 10.10.10.103)
- `Server3` -> `100.99.187.90` (LAN: 10.10.10.104)
- `srv881749` -> `31.97.142.155` (Tailscale: `100.99.164.88`) → **production monitoring server** (Hostinger VPS, Debian 12)
- `DemoControlPlaneServer` -> `192.168.139.213` → local OrbStack dev VM (classroom fallback only)

All three `Server*` nodes are part of the control plane in the current cluster config.

The monitoring host needs:

- Docker and Docker Compose
- the repo checkout or copied deployment assets
- a kubeconfig file with read access to the cluster

### Production monitoring server

The live production monitoring stack runs on `srv881749.hstgr.cloud` (`31.97.142.155`). The repo
is checked out at `/opt/clubcrm` on that host. The monitoring stack is started with:

```bash
cd /opt/clubcrm
docker compose --env-file .env -f infra/monitoring/docker-compose.monitoring.yml up -d
```

Port map on the production server:

| Port | Service           | Notes                                                                                  |
| ---- | ----------------- | -------------------------------------------------------------------------------------- |
| 3002 | monitor-web nginx | Same-origin proxy: `/` → monitor-app, `/monitor-api/` → monitor-api, `/ws/stream` → WS |
| 8010 | monitor-api       | FastAPI, also accessible directly for API calls                                        |
| 3000 | Grafana           | Separate Grafana instance for commission project                                       |
| 3100 | Loki              | Log aggregation for commission project                                                 |
| 8082 | commission-nginx  | Commission API nginx frontend                                                          |
| 80   | nginx/Coolify     | Reverse proxy for public routing                                                       |
| 443  | nginx/Coolify     | TLS termination                                                                        |
| 22   | SSH               | Standard SSH access                                                                    |

### Dev/OrbStack monitoring host

`DemoControlPlaneServer` at `192.168.139.213` is an OrbStack VM on the presenter's Mac. Use it
for classroom rehearsal when the production server is not appropriate. Ports on this host:

| Port | Service                              |
| ---- | ------------------------------------ |
| 3001 | monitor-app (Next.js or nginx proxy) |
| 8011 | monitor-api                          |
| 3005 | unknown / secondary service          |
| 22   | SSH (from OrbStack host network)     |

SSH access to the dev host uses port 2204 from outside the OrbStack network.

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

The default Compose deployment now publishes only the dashboard origin and proxies live API and
WebSocket traffic through it. That avoids mixed-content and `ws` vs `wss` mismatches when an HTTPS
edge sits in front of the monitoring host.

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
NEXT_PUBLIC_MONITOR_API_BASE_URL=/monitor-api
NEXT_PUBLIC_MONITOR_WS_URL=
NEXT_PUBLIC_CLUBCRM_DEMO_URL=https://demo.clubcrm.org/demo/failover
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
- root `probes`

The `volumes` collection represents Longhorn volume state, including PVC and workload correlation,
attachment node, state, robustness, and health. The `replicas` collection represents Longhorn
replica placement and health per volume.
The `probes` collection represents configured service probes, including current status, latency,
last success, and last failure details.

Keep fixture captures aligned to that root-level shape so `monitor-api` can load them directly.

## Verification

From the monitoring host, verify the deployment with:

```bash
curl http://localhost:8010/health
curl http://localhost:8010/api/snapshot
curl http://localhost:3001
```

For the production monitoring host at `31.97.142.155`:

```bash
curl http://31.97.142.155:8010/health
curl http://31.97.142.155:8010/api/snapshot
curl http://31.97.142.155:3002
curl http://31.97.142.155:3002/monitor-api/api/snapshot
```

For the dev OrbStack host at `192.168.139.213`:

```bash
curl http://192.168.139.213:8011/health
curl http://192.168.139.213:8011/api/snapshot
curl http://192.168.139.213:3001
```

In the browser, confirm:

- the dashboard loads without errors
- the cluster graph renders nodes and scheduled pods
- the Longhorn panel shows fixture or live `volumes` and `replicas` when available
- recent node, pod, volume, or replica events appear in the event feed
- the browser stays live through the dashboard origin without reconnect loops
