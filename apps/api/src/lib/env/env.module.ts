import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EnvService } from './env.service';
import { validateEnv } from './env.validation';

/**
 * Global module — import once in AppModule.
 * EnvService is then injectable in every module without repeated imports.
 */
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      expandVariables: true,
    }),
  ],
  providers: [ConfigService, EnvService],
  exports: [ConfigService, EnvService],
})
export class EnvModule {}
