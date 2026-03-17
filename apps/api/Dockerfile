# ---- base ----
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate

# ---- fetch (lockfile-only cache layer) ----
FROM base AS fetch
WORKDIR /app
COPY pnpm-lock.yaml ./
RUN pnpm fetch

# ---- install ----
FROM fetch AS install
COPY pnpm-workspace.yaml package.json ./
COPY packages/types/package.json ./packages/types/package.json
COPY apps/api/package.json ./apps/api/package.json
RUN pnpm install --offline --frozen-lockfile

# ---- build ----
FROM install AS builder
COPY packages/types ./packages/types
COPY apps/api ./apps/api
RUN pnpm --filter @spexs/types build
RUN pnpm --filter @spexs/api build

# ---- runner ----
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/pnpm-workspace.yaml /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/types ./packages/types
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist

WORKDIR /app/apps/api

EXPOSE 3001

CMD ["node", "dist/main"]
