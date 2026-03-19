import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import compression from 'compression';
import * as express from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { buildCorsConfig } from './config/cors.config';
import { HELMET_CONFIG } from './config/helmet.config';
import {
  BODY_SIZE_LIMITS,
  COMPRESSION_THRESHOLD_BYTES,
  REQUEST_TIMEOUT_MS,
} from './config/http.config';
import { EnvService } from './lib/env/env.service';
import { TrpcRouter } from './modules/trpc/trpc.router';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Body parsing is handled manually below so we can enforce size limits
    // before NestJS processes the request.
    bodyParser: false,
  });

  // ── Reverse-proxy trust ────────────────────────────────────────────────────
  // Trust exactly one upstream proxy hop (nginx / load-balancer).
  // Required for correct X-Forwarded-For resolution in rate limiting and logging.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // ── Environment ────────────────────────────────────────────────────────────
  const env = app.get(EnvService);
  const isProduction = env.get('NODE_ENV') === 'production';

  // ── Security headers (Helmet) ──────────────────────────────────────────────
  // Applied before all other middleware so headers are set on every response,
  // including error responses. Helmet config is in src/config/helmet.config.ts.
  app.use(helmet(HELMET_CONFIG));

  // ── CORS ───────────────────────────────────────────────────────────────────
  // Build the allowed-origins list: primary frontend + any extras from env.
  const allowedOrigins = [
    env.get('FRONTEND_URL'),
    ...env.get('ALLOWED_ORIGINS'),
  ];
  app.enableCors(buildCorsConfig(allowedOrigins));

  // ── Body size limits ───────────────────────────────────────────────────────
  // Explicit limits prevent large-payload DoS / memory exhaustion attacks.
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use(express.json({ limit: BODY_SIZE_LIMITS.JSON_LIMIT }));
  expressApp.use(
    express.urlencoded({
      extended: true,
      limit: BODY_SIZE_LIMITS.URL_ENCODED_LIMIT,
    }),
  );

  // ── Compression ───────────────────────────────────────────────────────────
  // Compress responses above the threshold; skip tiny payloads.
  app.use(compression({ threshold: COMPRESSION_THRESHOLD_BYTES }));

  // ── Global validation pipe ────────────────────────────────────────────────
  // Strips unknown properties and throws on invalid input before it reaches
  // any handler. The tRPC layer also validates with Zod, so this is a
  // defence-in-depth measure for the REST endpoints (health, auth).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ── Request timeout ───────────────────────────────────────────────────────
  // Terminates stalled connections. Protects against slow-loris attacks and
  // runaway DB queries that would otherwise hold the event loop.
  expressApp.use(
    (
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      res.setTimeout(REQUEST_TIMEOUT_MS);
      next();
    },
  );

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  // Allows in-flight requests to drain before the process exits.
  // Required for clean rolling deploys (k8s, ECS, etc.).
  if (isProduction) {
    app.enableShutdownHooks();
  }

  // ── tRPC middleware ───────────────────────────────────────────────────────
  const trpcRouter = app.get(TrpcRouter);
  await trpcRouter.applyMiddleware(app);

  await app.listen(env.get('PORT'));
}

bootstrap();
