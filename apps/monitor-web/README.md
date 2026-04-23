# Monitor Web

Standalone Next.js dashboard for the ClubCRM networking demo.

This app is intentionally separate from the primary ClubCRM `apps/web` application. It fetches the
live snapshot from `apps/monitor-api` and renders Kubernetes topology, Longhorn storage overlays,
and the recent event history.

See [docs/deployment/companion-monitoring-stack.md](../../docs/deployment/companion-monitoring-stack.md)
for the architecture guide, and
[docs/deployment/monitoring-stack.md](../../docs/deployment/monitoring-stack.md) for deployment
steps.

## Local Commands

From the repository root:

```bash
pnpm bootstrap:monitoring
pnpm dev:monitor-web
pnpm lint:monitor-web
pnpm build:monitor-web
pnpm test:monitor-web
```

## Environment

Important environment variables:

- `MONITOR_API_BASE_URL`
- `NEXT_PUBLIC_MONITOR_API_BASE_URL`
- `NEXT_PUBLIC_MONITOR_WS_URL`
- `MONITOR_ADMIN_TOKEN`
- `MONITOR_WEB_PORT`

If `NEXT_PUBLIC_MONITOR_WS_URL` is unset, the app derives the WebSocket URL from the public API
base URL by converting `http` to `ws` and appending `/ws/stream`.

`MONITOR_ADMIN_TOKEN` is optional. Set it only when `CLUSTER_VIEWER_PUBLIC=false` on the API and
the server-rendered snapshot fetch must include `Authorization: Bearer <token>`.
