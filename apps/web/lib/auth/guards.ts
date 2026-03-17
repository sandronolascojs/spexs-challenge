'use server';

import { headers } from 'next/headers';
import { getSession } from './auth-client';

/**
 * Server-only helper — forwards the incoming request cookies so Better Auth
 * can resolve the session on the NestJS API.
 *
 * Must only be called from Server Components, Route Handlers, or Server Actions.
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const requestHeaders = await headers();
  const session = await getSession({
    fetchOptions: {
      headers: {
        cookie: requestHeaders.get('cookie') ?? '',
      },
    },
  });
  return session?.data?.user !== undefined;
};
