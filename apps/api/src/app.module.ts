import { Module } from '@nestjs/common';
import { DatabaseModule, type DatabaseModuleOptions } from '@spexs/db';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './lib/auth';
import { EnvModule } from './lib/env/env.module';
import { EnvService } from './lib/env/env.service';
import { HealthModule } from './modules/health/health.module';
import { TrpcModule } from './modules/trpc/trpc.module';

@Module({
  imports: [
    EnvModule,
    DatabaseModule.forRootAsync({
      inject: [EnvService],
      useFactory: (env: EnvService): DatabaseModuleOptions => ({
        databaseUrl: env.get('DATABASE_URL'),
      }),
    }),
    AuthModule.forRoot({ auth }),
    HealthModule,
    TrpcModule,
  ],
})
export class AppModule {}
