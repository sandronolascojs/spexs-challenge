import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { EnvService } from './config/env.service';
import { TrpcRouter } from './trpc/trpc.router';

async function bootstrap() {
  // bodyParser must be disabled so Better Auth can process raw request bodies.
  // @thallesp/nestjs-better-auth re-adds body parsers for non-auth routes automatically.
  const app = await NestFactory.create(AppModule, { bodyParser: false });

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
