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
- `MONITOR_REPLAY_MODE`
- `MONITOR_REPLAY_API_URL`
- `NEXT_PUBLIC_MONITOR_REPLAY_MODE`
- `NEXT_PUBLIC_MONITOR_REPLAY_API_URL`
- `MONITOR_ADMIN_TOKEN`
- `MONITOR_WEB_PORT`

If `NEXT_PUBLIC_MONITOR_WS_URL` is unset, the app derives the WebSocket URL from the public API
base URL by converting `http` to `ws` and appending `/ws/stream`.

Replay mode is optional. Set `MONITOR_REPLAY_MODE=true` or `NEXT_PUBLIC_MONITOR_REPLAY_MODE=true`
to fetch a captured session from `MONITOR_REPLAY_API_URL` or
`NEXT_PUBLIC_MONITOR_REPLAY_API_URL`. If neither replay URL is set, the dashboard defaults to
`${MONITOR_API_BASE_URL}/api/replay`.

The dashboard now includes shared timeline controls for both live and replay sessions. Operators can
pause the live stream without dropping incoming frames, resume from the buffered backlog, and filter
the event feed by nodes, pods, storage, services, or cause markers during demos and rehearsals.

`MONITOR_ADMIN_TOKEN` is optional. Set it only when `CLUSTER_VIEWER_PUBLIC=false` on the API and
the server-rendered snapshot fetch must include `Authorization: Bearer <token>`.
