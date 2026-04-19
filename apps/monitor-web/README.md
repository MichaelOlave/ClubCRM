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
pnpm lint:monitor-web
pnpm build:monitor-web
pnpm test:monitor-web
```
