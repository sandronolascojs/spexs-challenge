import { env } from '@env';
import { createAuthClient } from 'better-auth/react';

/**
 * Better Auth client — single instance for the entire frontend.
 *
 * Pointing at the NestJS API where Better Auth is mounted at /api/auth.
 * Import { signIn, signUp, signOut, useSession } from here anywhere in the app.
 *
 * Note: useSession is a React hook — only call it inside 'use client' components.
 */
export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_API_URL,
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
