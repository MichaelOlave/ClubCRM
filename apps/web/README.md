# Web App

This is the ClubCRM web client, built with [Next.js](https://nextjs.org).

The current frontend is a UI-first MVP with:

- a root redirect that sends authorized users to `/dashboard`, authenticated-but-unprovisioned users to `/not-provisioned`, and everyone else to `/login`
- admin routes for the dashboard, profile, clubs, members, audit log, and diagnostics, with a role-aware shell for org admins versus club managers
- public routes for login, not-provisioned access messaging, and club join-request submission, with club-level join-request review in the admin shell
- same-origin auth handoff routes at `/api/auth/login` and `/auth/callback`
- feature-owned server modules that orchestrate backend auth, clubs, members, memberships, events, and announcements while some dashboard and join-form composition still stays web-side

## Getting Started

Use the repository devcontainer for local development. Before opening it, create `.env` from `.env.example` at the repository root. The devcontainer mounts the repo at `/workspace`, installs dependencies with `pnpm`, and forwards the web app on port `3000` or the next available host port.

The devcontainer Compose stack already starts the web app and the API. It also includes:

- `web` on `3000`
- `api` on `8000`
- `postgres` on `5432`
- `mongodb` on `27017`
- `redis` on `6379`
- `kafka` on `9092`

1. Open the repository in the devcontainer.
2. Open the forwarded web URL on host port `3000` or the next available port if `3000` is already taken. The resolved host-port bindings are written to `.devcontainer/docker-compose.ports.yml`.

If you need to restart the web server from the workspace terminal, run:

```bash
pnpm dev:web
```

The homepage currently checks the backend auth session, then redirects authorized users to `/dashboard`, authenticated-but-unprovisioned users to `/not-provisioned`, and everyone else to `/login`, so the most useful entry points to edit are usually:

- [`src/app/page.tsx`](src/app/page.tsx) for the root redirect
- [`src/app/(app)/dashboard/page.tsx`](<src/app/(app)/dashboard/page.tsx>) for the admin landing page
- [`src/app/(app)/profile/page.tsx`](<src/app/(app)/profile/page.tsx>) for the signed-in auth profile and session diagnostics surface
- [`src/app/(app)/clubs/[clubId]/page.tsx`](<src/app/(app)/clubs/[clubId]/page.tsx>) for the shared club detail surface that shows memberships, events, and announcements
- [`src/app/(app)/system/audit/page.tsx`](<src/app/(app)/system/audit/page.tsx>) for the admin audit log surface
- [`src/app/(app)/system/health/page.tsx`](<src/app/(app)/system/health/page.tsx>) for the API diagnostics surface
- [`src/app/demo/failover/page.tsx`](src/app/demo/failover/page.tsx) for the public failover monitor used in the networking demo
- [`src/app/(public)/login/page.tsx`](<src/app/(public)/login/page.tsx>), [`src/app/(public)/not-provisioned/page.tsx`](<src/app/(public)/not-provisioned/page.tsx>), or [`src/app/(public)/join/[clubId]/page.tsx`](<src/app/(public)/join/[clubId]/page.tsx>) for public entry points

## Notes

- The devcontainer runs with Docker Compose alongside the API and local data services.
- The PNPM store, workspace `node_modules`, web `node_modules`, web `.next`, and the API virtualenv are persisted in Docker volumes.
- File watching is configured with polling for reliable live reload in containers.
- The web service waits for the API health check before it starts.
- Most frontend data is currently provided by server-side view-model modules under `src/features/*/server`; `/system/health`, `/system/audit`, `/profile`, `/login`, and the protected admin route group now call into the FastAPI backend.
- Club detail pages also read memberships, upcoming events, and announcements from the backend so the admin shell can stay compact without adding more top-level routes yet.
- The public `/demo/failover` route also consumes the health feature's live-routing snapshot so the networking demo can watch pod changes without requiring a login.
- `API_BASE_URL` is the web server's preferred internal API target.
- `WEB_API_PUBLIC_BASE_URL` should stay pointed at the browser-reachable API origin for direct API links and as a server-side fallback when the web app cannot reach the Docker hostname directly.
- The web app proxies both auth start (`/api/auth/login`) and callback (`/auth/callback`) through the current browser origin so backend auth cookies stay aligned even when the devcontainer remaps ports or the browser host differs from `localhost`.
- The admin shell now redirects unauthenticated requests to `/login` and authenticated-but-unprovisioned requests to `/not-provisioned` after checking the backend-owned session.
- The root route uses the same auth-state split, so `/` is no longer a simple redirect to `/dashboard`.
- If you need to restart or validate the web app manually, use the root scripts from the workspace terminal.

## shadcn/ui

The frontend is configured for `shadcn/ui` with Tailwind v4. To keep the existing ClubCRM primitives available during migration, generated shadcn components are routed to `src/components/shadcn` instead of `src/components/ui`.

From `apps/web`, add new shadcn components with:

```bash
pnpm dlx shadcn@latest add button
```

The generated imports will resolve through `components.json`, so future shadcn components should stay isolated from the existing `src/components/ui` layer until the migration is complete.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
