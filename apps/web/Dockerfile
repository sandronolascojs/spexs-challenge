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
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --offline --frozen-lockfile

# ---- build ----
FROM install AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY packages/types ./packages/types
COPY apps/web ./apps/web
RUN pnpm --filter @spexs/types build
RUN pnpm --filter @spexs/web build

# ---- runner ----
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

ENV NEXT_TELEMETRY_DISABLED=1
# copy workspace skeleton so next start resolves its modules
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
