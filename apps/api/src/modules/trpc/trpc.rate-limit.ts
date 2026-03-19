import { TRPCError } from '@trpc/server';
import type { Request } from 'express';
import Redis from 'ioredis';

/**
 * Redis-backed IP rate limiter for tRPC procedures.
 *
 * Why a separate limiter from @nestjs/throttler?
 * ThrottlerGuard only covers NestJS-managed controllers.
 * The tRPC handler is a raw Express middleware outside the NestJS request
 * lifecycle, so ThrottlerGuard never fires for it. This module provides
 * equivalent protection at the tRPC layer.
 *
 * Implementation: fixed-window counter stored in Redis per (ip, path) key.
 * Redis is already in the stack (BullMQ), so there is no new infrastructure.
 * Counters survive process restarts and are shared across all instances.
 */

const TRPC_RATE_LIMIT = 120;
const TRPC_RATE_WINDOW_SECONDS = 60;

/** Lazy singleton — created once on first use, reused across requests. */
let redisClient: Redis | null = null;

function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
      // Fail fast on connection errors rather than queuing requests indefinitely.
      enableOfflineQueue: false,
      lazyConnect: true,
    });

    redisClient.on('error', (err: Error) => {
      // Log but do not crash — if Redis is unavailable we fall through and
      // allow the request rather than taking the API down.
      console.error(
        JSON.stringify({
          event: 'trpc.ratelimit.redis_error',
          message: err.message,
        }),
      );
    });
  }

  return redisClient;
}

/**
 * Resolves the real client IP from an Express request.
 * Respects X-Forwarded-For when trust proxy = 1 is set in main.ts.
 */
export function resolveClientIp(req: Request): string {
  return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
}

/**
 * Checks and increments the rate limit counter for the given IP + path.
 * Throws TRPCError TOO_MANY_REQUESTS if the limit is exceeded.
 * Falls through silently if Redis is unreachable (fail-open).
 */
export async function enforceTrpcRateLimit(
  ip: string,
  path: string,
): Promise<void> {
  const key = `trpc:rl:${ip}:${path}`;

  try {
    const redis = getRedis();

    // INCR atomically increments (or creates at 0 then increments to 1).
    const count = await redis.incr(key);

    // Set TTL on the first request of the window only.
    if (count === 1) {
      await redis.expire(key, TRPC_RATE_WINDOW_SECONDS);
    }

    if (count > TRPC_RATE_LIMIT) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests. Please slow down.',
      });
    }
  } catch (error) {
    // Re-throw tRPC rate limit errors — they are intentional.
    if (error instanceof TRPCError) throw error;

    // For any Redis connectivity issue, log and allow the request through.
    // Availability > strict rate limiting when infrastructure is degraded.
    console.error(
      JSON.stringify({
        event: 'trpc.ratelimit.fallback',
        message: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}
