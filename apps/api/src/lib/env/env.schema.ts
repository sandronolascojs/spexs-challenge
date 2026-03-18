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
  FRONTEND_URL: z.url().default('http://localhost:3000'),

  // ---------------------------------------------------------------------------
  // Redis (Job Queue)
  // ---------------------------------------------------------------------------
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),

  // ---------------------------------------------------------------------------
  // Email (Resend)
  // SEND_EMAILS: when false, emails are logged to console instead of sent
  // RESEND_API_KEY: required when SEND_EMAILS is true
  // FROM_EMAIL: sender address (must be verified in Resend)
  // ---------------------------------------------------------------------------
  SEND_EMAILS: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  RESEND_API_KEY: z.string().optional(),
  FROM_EMAIL: z.email().default('onboarding@resend.dev'),
});

export type Env = z.infer<typeof EnvSchema>;
