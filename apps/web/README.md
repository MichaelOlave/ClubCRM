# Web App

This is the ClubCRM web client, built with [Next.js](https://nextjs.org).

## Getting Started

Use the repository devcontainer for local development. The devcontainer mounts the repo at `/workspace`, installs dependencies with `pnpm`, and forwards the web app on port `3000`.

The full local Compose stack includes:

- `web` on `3000`
- `api` on `8000`
- `postgres` on `5432`
- `mongodb` on `27017`
- `redis` on `6379`
- `kafka` on `9092`

1. Open the repository in the devcontainer.
2. From the container terminal, change into `/workspace/apps/web`.
3. Start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the app by modifying `app/page.tsx`. The page auto-updates as you edit files.

## Notes

- The devcontainer runs with Docker Compose alongside the API and local data services.
- `node_modules` is stored in a Docker volume for the containerized workspace.
- File watching is configured with polling for reliable live reload in containers.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
