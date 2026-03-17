import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from './env.schema';

/**
 * Typed wrapper around ConfigService.
 * Inject EnvService instead of ConfigService to get full type safety on every env var.
 *
 * Usage:
 *   constructor(private readonly env: EnvService) {}
 *   this.env.get('DATABASE_URL') // string — never undefined
 */
@Injectable()
export class EnvService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  get<K extends keyof Env>(key: K): Env[K] {
    return this.config.get(key, { infer: true });
  }
}
