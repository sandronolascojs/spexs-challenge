import { Module } from '@nestjs/common';
import { DatabaseModule } from '@spexs/db';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './lib/auth';
import { EnvModule } from './lib/env/env.module';
import { HealthModule } from './modules/health/health.module';
import { TrpcModule } from './modules/trpc/trpc.module';

@Module({
  imports: [
    EnvModule,
    DatabaseModule,
    AuthModule.forRoot({ auth }),
    HealthModule,
    TrpcModule,
  ],
})
export class AppModule {}
