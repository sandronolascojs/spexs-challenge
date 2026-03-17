import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { haveIBeenPwned } from 'better-auth/plugins'
import { db } from '@spexs/db';

// ---------------------------------------------------------------------------
// Session constants
// ---------------------------------------------------------------------------

const SESSION_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7; // 7 days
const SESSION_UPDATE_AGE_SECONDS = 60 * 60 * 24;      // refresh every 24 h
const SESSION_COOKIE_CACHE_MAX_AGE_SECONDS = 60 * 5;  // 5 min cookie cache

// ---------------------------------------------------------------------------
// Rate limit constants
// ---------------------------------------------------------------------------

const DEFAULT_RATE_LIMIT_WINDOW_SECONDS = 10;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 100;

// Sensitive auth endpoints get tighter limits
const SIGN_IN_RATE_LIMIT = { window: 60, max: 5 } as const;
const SIGN_UP_RATE_LIMIT = { window: 60, max: 3 } as const;
const CHANGE_PASSWORD_RATE_LIMIT = { window: 60, max: 3 } as const;

// ---------------------------------------------------------------------------
// HaveIBeenPwned
// ---------------------------------------------------------------------------

const PWNED_PASSWORD_MESSAGE =
  'This password was found in a known data breach. Please choose a different password.';

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
 * - Secure cookies in production
 * - IP tracking for rate limiting
 * - CSRF protection (default, never disabled)
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
    },
  },

  session: {
    expiresIn: SESSION_EXPIRES_IN_SECONDS,
    updateAge: SESSION_UPDATE_AGE_SECONDS,
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
  plugins: [
    haveIBeenPwned({ customPasswordCompromisedMessage: PWNED_PASSWORD_MESSAGE }),
  ],
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
export type SessionUser = Session['user'];
