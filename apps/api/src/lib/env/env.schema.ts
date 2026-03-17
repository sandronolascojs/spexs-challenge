import { z } from 'zod';

const NodeEnv = z.enum(['development', 'production', 'test']);

export const EnvSchema = z.object({
  // ---------------------------------------------------------------------------
  // App
  // ---------------------------------------------------------------------------
  NODE_ENV: NodeEnv.default('development'),
  PORT: z.coerce.number().int().positive().default(3001),

  // ---------------------------------------------------------------------------
  // Database
  // ---------------------------------------------------------------------------
  DATABASE_URL: z.url({ protocol: /^postgres/ }),

  // ---------------------------------------------------------------------------
  // Better Auth
  // BETTER_AUTH_SECRET: min 32 chars — generate with: openssl rand -base64 32
  // BETTER_AUTH_URL:    full URL of this API (e.g. http://localhost:3001)
  // ---------------------------------------------------------------------------
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),

  // ---------------------------------------------------------------------------
  // Frontend
  // ---------------------------------------------------------------------------
  FRONTEND_URL: z.url().default('http://localhost:3000'),
});

export type Env = z.infer<typeof EnvSchema>;
