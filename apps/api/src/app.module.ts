import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule, type DatabaseModuleOptions } from '@spexs/db';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './lib/auth';
import { EnvModule } from './lib/env/env.module';
import { EnvService } from './lib/env/env.service';
import { EmailModule } from './modules/email/email.module';
import { HealthModule } from './modules/health/health.module';
import { SecurityModule } from './modules/security/security.module';
import { TrpcModule } from './modules/trpc/trpc.module';

@Module({
  imports: [
    EnvModule,
    SecurityModule,
    ScheduleModule.forRoot(),
    DatabaseModule.forRootAsync({
      inject: [EnvService],
      useFactory: (env: EnvService): DatabaseModuleOptions => ({
        databaseUrl: env.get('DATABASE_URL'),
      }),
    }),
    BullModule.forRootAsync({
      inject: [EnvService],
      useFactory: (env: EnvService) => ({
        connection: {
          host: env.get('REDIS_HOST'),
          port: env.get('REDIS_PORT'),
          // Allow the queue to buffer commands while Redis is temporarily
          // unavailable (e.g. during startup or a brief network hiccup).
          // Without this, ioredis throws immediately if the connection is
          // not yet established, crashing the NestJS bootstrap.
          enableOfflineQueue: true,
          lazyConnect: true,
          maxRetriesPerRequest: null,
        },
      }),
    }),
    AuthModule.forRoot({ auth }),
    EmailModule,
    HealthModule,
    TrpcModule,
  ],
})
export class AppModule {}
