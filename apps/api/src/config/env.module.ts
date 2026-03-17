import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { validateEnv } from './env.validation';
import { EnvService } from './env.service';

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
      // expandVariables allows ${VAR} substitution inside .env files
      expandVariables: true,
    }),
  ],
  providers: [ConfigService, EnvService],
  exports: [ConfigService, EnvService],
})
export class EnvModule {}
