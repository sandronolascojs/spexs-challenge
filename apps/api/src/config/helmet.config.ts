import type { HelmetOptions } from 'helmet';

/**
 * Content-Security-Policy directive values.
 * Centralised here so every directive is a named constant — no magic strings.
 */
const CSP_SELF = "'self'" as const;
const CSP_NONE = "'none'" as const;
const CSP_UNSAFE_INLINE = "'unsafe-inline'" as const;

/**
 * Helmet configuration for the NestJS API.
 *
 * Design decisions:
 * - CSP: locked to self-only. The API serves no HTML/scripts, so there is
 *   nothing to relax. Adjust if you add a Swagger UI in the future.
 * - HSTS: 1 year max-age with preload flag — after first HTTPS visit the
 *   browser will never downgrade to HTTP.
 * - Referrer-Policy: no-referrer prevents leaking API URLs to third parties.
 * - Permissions-Policy: all sensors/APIs denied — API does not need them.
 * - X-Frame-Options (frameguard): deny — prevents clickjacking.
 * - X-Content-Type-Options (noSniff): prevents MIME-type sniffing.
 * - X-DNS-Prefetch-Control: off — prevents browser DNS prefetch leaks.
 * - crossOriginEmbedderPolicy / crossOriginOpenerPolicy: enabled for
 *   cross-origin isolation (required for SharedArrayBuffer and performance.measureUserAgentSpecificMemory).
 */
export const HELMET_CONFIG: HelmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: [CSP_SELF],
      scriptSrc: [CSP_SELF],
      styleSrc: [CSP_SELF, CSP_UNSAFE_INLINE],
      imgSrc: [CSP_SELF, 'data:'],
      fontSrc: [CSP_SELF],
      connectSrc: [CSP_SELF],
      frameSrc: [CSP_NONE],
      objectSrc: [CSP_NONE],
      baseUri: [CSP_SELF],
      formAction: [CSP_SELF],
      frameAncestors: [CSP_NONE],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 60 * 60 * 24 * 365, // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: {
    policy: 'no-referrer',
  },
  frameguard: {
    action: 'deny',
  },
  noSniff: true,
  dnsPrefetchControl: { allow: false },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
} as const;
