import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import express, { Express, Request, Response } from 'express';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { setupSwagger } from '../src/swagger.config';

const server: Express = express();
let bootstrapPromise: Promise<void> | null = null;

async function bootstrapServer(expressInstance: Express): Promise<void> {
  expressInstance.disable('x-powered-by');

  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressInstance),
  );

  app.use(compression());
  app.use(express.json({ limit: '64kb' }));
  app.use(express.urlencoded({ limit: '64kb', extended: false }));

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

  app.useGlobalFilters(new HttpExceptionFilter());

  if (process.env.SWAGGER_ENABLED !== 'false') {
    setupSwagger(app);
  }

  await app.init();
}

function getAppInstance(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = bootstrapServer(server);
  }
  return bootstrapPromise;
}

export default async function handler(req: Request, res: Response) {
  try {
    await getAppInstance();
    return server(req, res);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      statusCode: 500,
      error: 'Internal Server Error',
      message: errorMsg,
      timestamp: new Date().toISOString(),
    });
  }
}
