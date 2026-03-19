import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/**
 * Builds the CORS configuration for the API.
 *
 * @param allowedOrigins - Whitelist of origins. Sourced from FRONTEND_URL env
 *   (and ALLOWED_ORIGINS for multi-tenant / staging environments).
 *
 * Security decisions:
 * - credentials: true   — required for Better Auth cookie-based sessions.
 * - allowedHeaders      — explicit whitelist; never '*'. Includes the
 *   standard tRPC batch header and the Better Auth CSRF header.
 * - exposedHeaders      — only expose what the client genuinely needs.
 * - maxAge              — 1 h preflight cache reduces OPTIONS round-trips.
 * - methods             — explicit; HEAD and PATCH are excluded (unused).
 */
export function buildCorsConfig(allowedOrigins: string[]): CorsOptions {
  return {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'x-trpc-source',
      'x-csrf-token',
    ],
    exposedHeaders: ['Set-Cookie'],
    maxAge: 3_600,
  };
}
