/**
 * Jest manual mock for @spexs/db.
 *
 * Unit tests never need the actual Drizzle runtime (tables, schema, db
 * instance, NestJS module).  They import @spexs/db only for TypeScript types
 * — which are erased at runtime — and for the exported token strings used as
 * NestJS provider tokens.
 *
 * Exporting empty objects / stubs for every public symbol keeps Jest happy
 * without pulling in @paralleldrive/cuid2 (ESM-only) which breaks Jest's
 * CommonJS transform.
 */

// ── Table stubs (used as NestJS injection tokens or import shapes) ────────────
export const users = {};
export const sessions = {};
export const accounts = {};
export const verifications = {};
export const workflows = {};
export const workflowNodes = {};
export const workflowConnections = {};
export const executions = {};
export const nodeExecutions = {};
export const alertEvents = {};
export const eventComments = {};
export const nodeExecutionComments = {};
export const notifications = {};

// ── NestJS module stubs ───────────────────────────────────────────────────────
export const DatabaseModule = { forRoot: jest.fn(), forRootAsync: jest.fn() };
export const DatabaseService = class DatabaseService {};

// ── db instance stub ──────────────────────────────────────────────────────────
export const db = {};
export const sql = jest.fn();
export const initialize = jest.fn();
export const close = jest.fn();

// ── Type-only re-exports — everything else is erased at compile time ──────────
// (No runtime values needed; TypeScript imports them as `type` imports.)
