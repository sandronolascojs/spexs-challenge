import type { ThrottlerModuleOptions } from '@nestjs/throttler';

/**
 * Named throttle window/limit constants — no magic numbers anywhere.
 *
 * Three tiers:
 *   SHORT  — 10 req / 1 s   → burst protection (DoS/flood)
 *   MEDIUM — 60 req / 1 min → sustained abuse prevention
 *   LONG   — 200 req / 1 h  → crawlers / scrapers
 *
 * All three guards run in parallel on every request.
 * A request is rejected (429) as soon as it exceeds ANY tier.
 */

const SHORT_TTL_MS = 1_000; // 1 second
const SHORT_LIMIT = 10;

const MEDIUM_TTL_MS = 60_000; // 1 minute
const MEDIUM_LIMIT = 60;

const LONG_TTL_MS = 3_600_000; // 1 hour
const LONG_LIMIT = 200;

export const THROTTLER_CONFIG: ThrottlerModuleOptions = {
  throttlers: [
    { name: 'short', ttl: SHORT_TTL_MS, limit: SHORT_LIMIT },
    { name: 'medium', ttl: MEDIUM_TTL_MS, limit: MEDIUM_LIMIT },
    { name: 'long', ttl: LONG_TTL_MS, limit: LONG_LIMIT },
  ],
} as const;
