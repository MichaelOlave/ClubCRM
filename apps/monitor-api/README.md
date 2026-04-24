# Monitor API

Standalone FastAPI event stream for the ClubCRM networking demo.

This app is intentionally separate from the main ClubCRM `apps/api` service. The live host accepts
live Kubernetes and Longhorn state via snapshot plus WebSocket event frames for the monitoring
dashboard.

See [docs/deployment/companion-monitoring-stack.md](../../docs/deployment/companion-monitoring-stack.md)
for the architecture guide, and
[docs/deployment/monitoring-stack.md](../../docs/deployment/monitoring-stack.md) for deployment
steps.

## Local Commands

From the repository root:

```bash
pnpm bootstrap:monitoring
pnpm dev:monitor-api
pnpm lint:monitor-api
pnpm check:monitor-api
pnpm test:monitor-api
```

## API Surface

The live API currently exposes:

- `GET /health`
- `GET /api/snapshot`
- `WS /ws/stream`

`GET /api/snapshot` returns a live cluster snapshot with these top-level sections:

- `type`
- `ts`
- `nodes`
- `pods`
- `volumes`
- `replicas`

The Longhorn collections are additive Phase 2 work:

- `volumes` tracks attachment node, workload correlation, state, robustness, and health
- `replicas` tracks per-volume replica health and node placement

## Environment

Important environment variables:

- `MONITOR_API_TITLE`
- `MONITOR_API_HOST`
- `MONITOR_API_PORT`
- `MONITOR_API_BASE_URL`
- `MONITOR_ADMIN_TOKEN`
- `CLUSTER_VIEWER_PUBLIC`
- `MONITOR_CLUSTER_KUBECONFIG`
- `MONITOR_CLUSTER_CONTEXT`
- `MONITOR_CLUSTER_IN_CLUSTER`
- `MONITOR_CLUSTER_SNAPSHOT_FILE`
- `MONITOR_CLUSTER_RECORDING_FILE`
- `MONITOR_LONGHORN_ENABLED`
- `MONITOR_CLUSTER_HEARTBEAT_SECONDS`
- `MONITOR_CLUSTER_WATCH_TIMEOUT_SECONDS`
- `MONITOR_PROBE_TARGETS`
- `MONITOR_PROBE_INTERVAL_SECONDS`
- `MONITOR_PROBE_TIMEOUT_SECONDS`
- `MONITOR_PROBE_DEGRADED_LATENCY_MS`
- `MONITOR_DISABLE_BACKGROUND_TASKS`

`MONITOR_LONGHORN_ENABLED` defaults to `true`. Disable it when the target cluster does not have the
Longhorn CRDs installed and you only want node and pod watches.

`MONITOR_PROBE_TARGETS` is optional. When set, `monitor-api` probes each configured URL and folds
the current status into snapshots while emitting `PROBE_OK`, `PROBE_DEGRADED`, and `PROBE_FAILED`
events for status transitions. Use comma-separated entries such as
`clubcrm-web=https://clubcrm.local/login,clubcrm-api=https://clubcrm.local/api/health`.

`MONITOR_CLUSTER_RECORDING_FILE` is optional. When set, `monitor-api` appends snapshots and event
frames to a JSONL file and exposes the captured session through `GET /api/replay` for replay mode
in `monitor-web`.

Without `MONITOR_CLUSTER_RECORDING_FILE`, the app keeps its current cluster state and recent event
stream in memory only, so a restart resets the timeline.
