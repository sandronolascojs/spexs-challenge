import { EnvSchema } from './env.schema';

/**
 * Passed to ConfigModule.forRoot({ validate }).
 * Runs at bootstrap — throws and exits if any required variable is missing or invalid.
 */
export function validateEnv(config: Record<string, unknown>) {
  const result = EnvSchema.safeParse(config);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(`Environment validation failed:\n${formatted}`);
  }

  return result.data;
}
