# Monitor Web

Standalone Next.js control center for the ClubCRM networking demo.

This app is intentionally separate from the primary ClubCRM `apps/web` application. It talks to the
companion `apps/monitor-api` service for live monitoring data and control actions.

See [docs/deployment/companion-monitoring-stack.md](../../docs/deployment/companion-monitoring-stack.md)
for the full architecture and data-flow guide, and
[docs/deployment/monitoring-stack.md](../../docs/deployment/monitoring-stack.md) for deployment steps.

## Local Commands

From the repository root:

```bash
pnpm bootstrap:monitoring
pnpm dev:monitor-web
pnpm dev:monitor-web:live
pnpm lint:monitor-web
pnpm build:monitor-web
pnpm test:monitor-web
```

For a live-linked local dashboard, copy `.env.monitoring.dashboard.example` to
`.env.monitoring.dashboard` and run `pnpm dev:monitor-web:live`.

Set `CONTROL_MODE_PASSWORD` when you want the operational control mode to require a password. The
unlock is cached in a browser cookie for 12 hours, while demo mode remains available without it.
