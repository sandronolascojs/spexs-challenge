import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { THROTTLER_CONFIG } from '../../config/throttler.config';

/**
 * SecurityModule — wires all infrastructure-level security concerns.
 *
 * Responsibilities:
 * - Registers ThrottlerModule with the three-tier rate limiting config.
 * - Binds ThrottlerGuard as a global APP_GUARD so every route is protected
 *   by default. Individual routes can opt-out with @SkipThrottle().
 *
 * Import once in AppModule.
 */
@Module({
  imports: [ThrottlerModule.forRoot(THROTTLER_CONFIG)],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class SecurityModule {}
