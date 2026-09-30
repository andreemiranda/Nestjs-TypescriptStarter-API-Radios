import * as dotenv from 'dotenv';
const initialEnvKey = process.env.API_KEY;
dotenv.config({ override: true });
if (initialEnvKey && initialEnvKey !== process.env.API_KEY) {
  process.env.SYSTEM_API_KEY = initialEnvKey;
}
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import compression from 'compression';
import express from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { setupSwagger } from './swagger.config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable graceful shutdown hooks for SIGTERM / SIGINT signals
  app.enableShutdownHooks();

  // Disable X-Powered-By header to prevent technology fingerprinting
  app.disable('x-powered-by');

  // Gzip compression for optimized payload delivery
  app.use(compression());

  // Protect against large payload DoS attacks
  app.use(express.json({ limit: '64kb' }));
  app.use(express.urlencoded({ limit: '64kb', extended: false }));

  // Comprehensive security headers via Helmet (compatible with Swagger UI CDN & iframe embedding)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false,
      frameguard: false,
      hidePoweredBy: true,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: false,
      referrerPolicy: { policy: 'no-referrer-when-downgrade' },
      xssFilter: true,
    }),
  );

  // Hardened CORS configuration (read-only API)
  const allowedOrigins = process.env.CORS_ORIGIN || '*';
  app.enableCors({
    origin: allowedOrigins.includes(',')
      ? allowedOrigins.split(',').map((o) => o.trim())
      : allowedOrigins,
    methods: ['GET', 'HEAD', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'X-API-Key',
      'Authorization',
    ],
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'Retry-After',
    ],
    maxAge: 86400,
  });

  // Strict global input validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter with credential redaction
  app.useGlobalFilters(new HttpExceptionFilter());

  // Interactive Swagger UI documentation (can be disabled via SWAGGER_ENABLED=false)
  if (process.env.SWAGGER_ENABLED !== 'false') {
    setupSwagger(app);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
}
void bootstrap();
