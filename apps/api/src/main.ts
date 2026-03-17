import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { EnvService } from './lib/env/env.service';
import { TrpcRouter } from './modules/trpc/trpc.router';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // Trust one layer of reverse-proxy headers so Better Auth rate limiting
  // can resolve the real client IP from X-Forwarded-For / X-Real-IP.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  const env = app.get(EnvService);

  app.enableCors({
    origin: env.get('FRONTEND_URL'),
    credentials: true, // required for Better Auth cookie-based sessions
  });

  const trpcRouter = app.get(TrpcRouter);
  await trpcRouter.applyMiddleware(app);

  await app.listen(env.get('PORT'));
}
bootstrap();
