import { Module } from '@nestjs/common';
import { DatabaseModule } from '@spexs/db';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EnvModule } from './config/env.module';
import { auth } from './lib/auth';
import { TrpcModule } from './trpc/trpc.module';

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
