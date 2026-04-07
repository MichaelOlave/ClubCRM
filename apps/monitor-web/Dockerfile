FROM node:22-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PNPM_STORE_DIR=/pnpm/store
ENV PATH=/pnpm:$PATH

RUN corepack enable

FROM base AS deps

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/monitor-web/package.json ./apps/monitor-web/package.json

RUN pnpm install --frozen-lockfile --filter monitor-web...

FROM base AS builder

WORKDIR /app

COPY --from=deps /pnpm /pnpm
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/monitor-web/node_modules ./apps/monitor-web/node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/monitor-web ./apps/monitor-web

RUN pnpm --filter monitor-web build

FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3001

WORKDIR /app

COPY --from=builder /app/apps/monitor-web/.next/standalone ./
COPY --from=builder /app/apps/monitor-web/.next/static ./apps/monitor-web/.next/static
COPY --from=builder /app/apps/monitor-web/public ./apps/monitor-web/public

EXPOSE 3001

CMD ["node", "apps/monitor-web/server.js"]
