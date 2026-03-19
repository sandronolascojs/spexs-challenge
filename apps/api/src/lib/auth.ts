import { db } from '@spexs/db';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { haveIBeenPwned } from 'better-auth/plugins';
import type {
  Session as BetterAuthSession,
  User as BetterAuthUser,
} from 'better-auth/types';

// ---------------------------------------------------------------------------
// Session constants
// ---------------------------------------------------------------------------

const SESSION_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7; // 7 days
const SESSION_UPDATE_AGE_SECONDS = 60 * 60 * 24; // refresh every 24 h
const SESSION_FRESH_AGE_SECONDS = 60 * 60; // 1 h — re-auth required for sensitive ops
const SESSION_COOKIE_CACHE_MAX_AGE_SECONDS = 60 * 5; // 5 min cookie cache

// ---------------------------------------------------------------------------
// Rate limit constants
// ---------------------------------------------------------------------------

const DEFAULT_RATE_LIMIT_WINDOW_SECONDS = 10;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 100;

// Sensitive auth endpoints get tighter limits
const SIGN_IN_RATE_LIMIT = { window: 60, max: 5 } as const;
const SIGN_UP_RATE_LIMIT = { window: 60, max: 3 } as const;
const CHANGE_PASSWORD_RATE_LIMIT = { window: 60, max: 3 } as const;
const FORGOT_PASSWORD_RATE_LIMIT = { window: 60, max: 3 } as const;

// ---------------------------------------------------------------------------
// HaveIBeenPwned
// ---------------------------------------------------------------------------

const PWNED_PASSWORD_MESSAGE =
  'This password was found in a known data breach. Please choose a different password.';

// ---------------------------------------------------------------------------
// Audit log helper
// ---------------------------------------------------------------------------

function auditLog(record: Record<string, unknown>): void {
  // Replace with your structured logger / SIEM sink in production.
  console.log(JSON.stringify(record));
}

function resolveRequestIp(
  context: { request?: Request | null } | null,
): string {
  return (
    context?.request?.headers.get('x-forwarded-for') ??
    context?.request?.headers.get('x-real-ip') ??
    'unknown'
  );
}

// ---------------------------------------------------------------------------
// Auth instance
// ---------------------------------------------------------------------------

/**
 * Better Auth instance — single source of truth for auth config.
 *
 * Secret:   read from BETTER_AUTH_SECRET env var (never hardcoded).
 * Base URL: read from BETTER_AUTH_URL env var.
 *
 * Security features enabled:
 * - Rate limiting (database-backed, tight limits on sensitive endpoints)
 * - Session cookie cache (compact HMAC, 5 min TTL)
 * - Session freshAge (1 h — forces re-auth for sensitive operations)
 * - Secure cookies in production
 * - IP tracking for rate limiting
 * - CSRF protection (default, never disabled)
 * - HaveIBeenPwned password check on sign-up and password change
 * - Database audit hooks for session creation/deletion and email changes
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    usePlural: true,
  }),

  emailAndPassword: { enabled: true },

  trustedOrigins: [process.env.FRONTEND_URL ?? 'http://localhost:3000'],

  rateLimit: {
    enabled: true,
    storage: 'database',
    window: DEFAULT_RATE_LIMIT_WINDOW_SECONDS,
    max: DEFAULT_RATE_LIMIT_MAX_REQUESTS,
    customRules: {
      '/api/auth/sign-in/email': SIGN_IN_RATE_LIMIT,
      '/api/auth/sign-up/email': SIGN_UP_RATE_LIMIT,
      '/api/auth/change-password': CHANGE_PASSWORD_RATE_LIMIT,
      '/api/auth/forget-password': FORGOT_PASSWORD_RATE_LIMIT,
    },
  },

  session: {
    expiresIn: SESSION_EXPIRES_IN_SECONDS,
    updateAge: SESSION_UPDATE_AGE_SECONDS,
    // freshAge: requests to sensitive endpoints (change-password, change-email)
    // require a session issued within this window. Prevents session-hijacking
    // attacks where the attacker has a valid but old token.
    freshAge: SESSION_FRESH_AGE_SECONDS,
    cookieCache: {
      enabled: true,
      maxAge: SESSION_COOKIE_CACHE_MAX_AGE_SECONDS,
      // compact = Base64url + HMAC: smallest footprint, no sensitive data exposed
      strategy: 'compact',
    },
  },

  advanced: {
    // Secure cookies enforced in production; disabled locally to allow HTTP
    useSecureCookies: process.env.NODE_ENV === 'production',
    cookiePrefix: 'spexs',
    defaultCookieAttributes: {
      // lax: protects against CSRF while allowing top-level OAuth redirects
      sameSite: 'lax',
    },
    ipAddress: {
      // Check standard proxy headers for real IP (needed for rate limiting)
      ipAddressHeaders: ['x-forwarded-for', 'x-real-ip'],
      disableIpTracking: false,
    },
  },

  // ---------------------------------------------------------------------------
  // Audit hooks
  //
  // These run inside Better Auth's own DB transaction and are the authoritative
  // source for security-relevant events. In production, replace auditLog with
  // your structured logger / SIEM sink.
  // ---------------------------------------------------------------------------
  databaseHooks: {
    session: {
      create: {
        after: async (
          session: BetterAuthSession & Record<string, unknown>,
          context,
        ) => {
          auditLog({
            event: 'session.created',
            userId: session.userId,
            sessionId: session.id,
            ip: resolveRequestIp(context),
            userAgent: context?.request?.headers.get('user-agent') ?? 'unknown',
          });
        },
      },
      delete: {
        before: async (
          session: BetterAuthSession & Record<string, unknown>,
        ) => {
          auditLog({
            event: 'session.revoked',
            sessionId: session.id,
          });
        },
      },
    },
    user: {
      update: {
        after: async (
          user: BetterAuthUser & Record<string, unknown>,
          context,
        ) => {
          auditLog({
            event: 'user.updated',
            userId: user.id,
            ip: resolveRequestIp(context),
          });
        },
      },
    },
  },

  plugins: [
    haveIBeenPwned({
      customPasswordCompromisedMessage: PWNED_PASSWORD_MESSAGE,
    }),
  ],
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
export type SessionUser = Session['user'];
