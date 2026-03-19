import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';
import { auth } from '../../lib/auth';
import type { Session } from '../../lib/auth';
import { enforceTrpcRateLimit, resolveClientIp } from './trpc.rate-limit';

export interface TrpcContext {
  session: Session | null;
  /** Resolved client IP — available to all procedures for logging/auditing. */
  clientIp: string;
}

export async function createTrpcContext({
  req,
}: {
  req: Request;
}): Promise<TrpcContext> {
  const clientIp = resolveClientIp(req);

  // Per-IP rate limiting at the tRPC layer — Redis-backed, shared across
  // all instances. Throws TOO_MANY_REQUESTS if the limit is exceeded.
  await enforceTrpcRateLimit(clientIp, req.path ?? 'unknown');

  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  return { session, clientIp };
}
