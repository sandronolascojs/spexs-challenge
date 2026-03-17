import { Module } from '@nestjs/common';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { DatabaseModule } from '@spexs/db';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EnvModule } from './config/env.module';
import { TrpcModule } from './trpc/trpc.module';
import { auth } from './lib/auth';

@Module({
  imports: [
    EnvModule,
    DatabaseModule,
    AuthModule.forRoot({ auth }),
    TrpcModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
