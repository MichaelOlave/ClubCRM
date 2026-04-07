# Monitor API

Standalone FastAPI control plane for the ClubCRM networking demo.

This app is intentionally separate from the main ClubCRM `apps/api` service. It accepts VM agent
heartbeats, runs synthetic checks, polls Kubernetes and OrbStack state, exposes a read-only
snapshot feed, and handles destructive demo controls behind explicit endpoints.

See [docs/deployment/companion-monitoring-stack.md](../../docs/deployment/companion-monitoring-stack.md)
for the full architecture and data-flow guide, and
[docs/deployment/monitoring-stack.md](../../docs/deployment/monitoring-stack.md) for deployment steps.

## Local Commands

From the repository root:

```bash
pnpm bootstrap:monitoring
pnpm dev:monitor-api
pnpm lint:monitor-api
pnpm check:monitor-api
pnpm test:monitor-api
```

## Environment

Important environment variables:

- `MONITOR_API_PORT`
- `MONITOR_ADMIN_TOKEN`
- `MONITOR_AGENT_TOKENS`
- `MONITOR_TARGET_VMS`
- `MONITOR_SYNTHETIC_TARGET_URL`
- `MONITOR_ORBSTACK_SSH_HOST` and `MONITOR_ORBSTACK_SSH_USER` when the monitor API runs on a
  separate VM
- local `orbctl` availability when the monitor API runs on the same Mac host as OrbStack
- `MONITOR_ORBSTACK_REMOTE_WRAPPER`
- `MONITOR_K8S_SNAPSHOT_FILE`

The app keeps monitoring history in memory in v1. A restart resets the rolling windows and event
timeline.

When `kubectl` access is available, the snapshot feed also includes Kubernetes storage details for
the networking final, including storage classes, PVC status, and Longhorn volume health.
