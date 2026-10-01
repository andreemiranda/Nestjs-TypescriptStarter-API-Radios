import { NestFactory } from '@nestjs/core';
import express, { Express, Request, Response } from 'express';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap/configure-app';
import { appLogger } from '../src/common/services/logger.service';

const server: Express = express();
let bootstrapPromise: Promise<void> | null = null;

async function bootstrapServer(expressInstance: Express): Promise<void> {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressInstance),
    {
      logger: appLogger,
    },
  );

  configureApp(app);
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
    const correlationId = (req.headers['x-request-id'] as string) || 'serverless-error';
    appLogger.error(
      `Erro critico no handler serverless [${correlationId}]: ${errorMsg}`,
      undefined,
      'VercelHandler',
    );

    const isProduction = process.env.NODE_ENV === 'production';
    res.status(500).json({
      statusCode: 500,
      error: 'Internal Server Error',
      message: isProduction ? 'Internal server error' : errorMsg,
      correlationId,
      timestamp: new Date().toISOString(),
    });
  }
}
