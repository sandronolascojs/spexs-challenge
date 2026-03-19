/**
 * HTTP body-size limits.
 *
 * Keep these small: the API is a JSON/tRPC API — there are no file uploads.
 * Large payloads are almost always a sign of abuse (ReDoS via huge JSON, etc.).
 */
export const BODY_SIZE_LIMITS = {
  /** Maximum JSON payload accepted by the Express body-parser. */
  JSON_LIMIT: '100kb',
  /** Maximum URL-encoded form payload. */
  URL_ENCODED_LIMIT: '50kb',
} as const;

/**
 * Global request timeout in milliseconds.
 * Requests that take longer than this are terminated with 408.
 * Protects against slow-loris and long-running queries that starve the event loop.
 */
export const REQUEST_TIMEOUT_MS = 30_000; // 30 seconds

/**
 * Compression threshold in bytes.
 * Responses smaller than this are not compressed (avoids overhead for tiny JSON).
 */
export const COMPRESSION_THRESHOLD_BYTES = 1_024; // 1 KB
