ARG NODE_VERSION=22-alpine

# ---- base ----
FROM node:${NODE_VERSION} AS base
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate

# ---- pruner ----
# Copies only lockfile + manifests to produce the pruned workspace subset.
# turbo is available as a pnpm script after install so no global install needed.
# .dockerignore strips node_modules / .next / dist — context stays small.
FROM base AS pruner
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/db/package.json ./packages/db/package.json
RUN pnpm fetch
RUN pnpm install --offline --frozen-lockfile --ignore-scripts
# prune outputs out/json/ (manifests) and out/full/ (source) for @spexs/web
# and all workspace deps it needs (@spexs/api, @spexs/db, @spexs/types)
COPY . .
RUN pnpm exec turbo prune @spexs/web --docker

# ---- install ----
# Only pruned manifests + lockfile are copied first — cached until a
# package.json or lockfile changes.
FROM base AS install
WORKDIR /app
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=pruner /app/out/json/ .
RUN pnpm fetch
RUN pnpm install --offline --frozen-lockfile

# ---- build ----
FROM install AS builder
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_API_URL is baked into the bundle at build time.
# Must be the URL the browser uses to reach the API.
# Override via docker-compose build.args for non-localhost deployments.
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY --from=pruner /app/out/full/ .
COPY --from=pruner /app/turbo.json ./turbo.json
# turbo respects ^build — builds @spexs/types → @spexs/db → @spexs/api → @spexs/web in order
RUN pnpm exec turbo build --filter=@spexs/web

# ---- runner ----
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/pnpm-workspace.yaml /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/types ./packages/types
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public

WORKDIR /app/apps/web

EXPOSE 3000

CMD ["pnpm", "start"]
