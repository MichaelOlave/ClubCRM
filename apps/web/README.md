# Web App

This is the ClubCRM web client, built with [Next.js](https://nextjs.org).

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

You can start editing the app by modifying [`apps/web/src/app/page.tsx`](/Users/michaelolave/Projects/active/ClubCRM/apps/web/src/app/page.tsx). The page auto-updates as you edit files.

## Notes

- The devcontainer runs with Docker Compose alongside the API and local data services.
- The PNPM store, workspace `node_modules`, web `node_modules`, web `.next`, and the API virtualenv are persisted in Docker volumes.
- File watching is configured with polling for reliable live reload in containers.
- The web service waits for the API health check before it starts.
- If you need to restart or validate the web app manually, use the root scripts from the workspace terminal.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
