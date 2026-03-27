# Web App

This is the ClubCRM web client, built with [Next.js](https://nextjs.org).

The current frontend is a UI-first MVP with:

- admin routes for the dashboard, clubs, members, and diagnostics
- public routes for login and club join-form previews
- feature-owned server modules that provide view models while the backend contract is still minimal

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

The homepage currently redirects to `/dashboard`, so the most useful entry points to edit are usually:

- [`src/app/page.tsx`](src/app/page.tsx) for the root redirect
- [`src/app/(app)/dashboard/page.tsx`](<src/app/(app)/dashboard/page.tsx>) for the admin landing page
- [`src/app/(app)/system/health/page.tsx`](<src/app/(app)/system/health/page.tsx>) for the API diagnostics surface
- [`src/app/(public)/login/page.tsx`](<src/app/(public)/login/page.tsx>) or [`src/app/(public)/join/[clubId]/page.tsx`](<src/app/(public)/join/[clubId]/page.tsx>) for public entry points

## Notes

- The devcontainer runs with Docker Compose alongside the API and local data services.
- The PNPM store, workspace `node_modules`, web `node_modules`, web `.next`, and the API virtualenv are persisted in Docker volumes.
- File watching is configured with polling for reliable live reload in containers.
- The web service waits for the API health check before it starts.
- Most frontend data is currently provided by server-side view-model modules under `src/features/*/server`; only `/system/health` currently calls the FastAPI backend.
- If you need to restart or validate the web app manually, use the root scripts from the workspace terminal.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
