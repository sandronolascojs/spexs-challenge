ARG NODE_VERSION=22-alpine

# ---- base ----
FROM node:${NODE_VERSION} AS base
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate

# ---- fetch ----
# Lockfile-only layer — cached until pnpm-lock.yaml changes.
FROM base AS fetch
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/types/package.json ./packages/types/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY apps/api/package.json ./apps/api/package.json
RUN pnpm fetch

# ---- install ----
FROM fetch AS install
RUN pnpm install --offline --frozen-lockfile

# ---- build ----
FROM install AS builder
COPY packages/types ./packages/types
COPY packages/db ./packages/db
COPY apps/api ./apps/api
COPY turbo.json ./turbo.json
# turbo respects ^build — builds @spexs/types → @spexs/db → @spexs/api in order
RUN pnpm exec turbo build --filter=@spexs/api

# ---- runner ----
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/pnpm-workspace.yaml /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/types ./packages/types
COPY --from=builder /app/packages/db ./packages/db
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist

WORKDIR /app/apps/api

EXPOSE 3001

CMD ["node", "dist/main"]
