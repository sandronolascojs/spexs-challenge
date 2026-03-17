import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';
import { auth } from '../lib/auth';
import type { Session } from '../lib/auth';

export interface TrpcContext {
  session: Session | null;
}

export async function createTrpcContext({
  req,
}: {
  req: Request;
}): Promise<TrpcContext> {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  return { session };
}
