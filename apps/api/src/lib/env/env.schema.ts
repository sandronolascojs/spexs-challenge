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
  // CORS
  // FRONTEND_URL:    primary frontend origin (always trusted)
  // ALLOWED_ORIGINS: optional comma-separated list of additional trusted origins
  //                  (e.g. staging preview URLs, mobile deep-link schemes)
  // ---------------------------------------------------------------------------
  FRONTEND_URL: z.url().default('http://localhost:3000'),
  ALLOWED_ORIGINS: z
    .string()
    .default('')
    .transform((v) =>
      v
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ),

  // ---------------------------------------------------------------------------
  // Redis (Job Queue)
  // ---------------------------------------------------------------------------
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),

  // ---------------------------------------------------------------------------
  // Email (Mailtrap sandbox)
  // SEND_EMAILS:         when false, emails are logged to console instead of sent
  // MAILTRAP_API_KEY:    required when SEND_EMAILS is true
  // MAILTRAP_INBOX_ID:  sandbox inbox ID from the Mailtrap dashboard
  // FROM_EMAIL:          sender address shown in the sandbox inbox
  // ---------------------------------------------------------------------------
  SEND_EMAILS: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  MAILTRAP_API_KEY: z.string().optional(),
  MAILTRAP_INBOX_ID: z.coerce.number().int().positive().optional(),
  FROM_EMAIL: z.email().default('hello@example.com'),
});

export type Env = z.infer<typeof EnvSchema>;
