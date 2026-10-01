import { INestApplication, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import express, { Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { SecurityMiddleware } from '../common/middleware/security.middleware';
import { setupSwagger } from '../swagger.config';
import { appLogger } from '../common/services/logger.service';

export function configureApp(app: INestApplication): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const expressApp = app
    .getHttpAdapter()
    .getInstance() as unknown as express.Application;

  // 1. Remove cabecalho de fingerprinting tecnologico
  if (expressApp && typeof expressApp.disable === 'function') {
    expressApp.disable('x-powered-by');
  }

  // 2. Configuracao explicita e segura de 'trust proxy'
  const trustProxySetting = process.env.TRUST_PROXY || '1';
  if (expressApp && typeof expressApp.set === 'function') {
    const numericHops = parseInt(trustProxySetting, 10);
    if (!Number.isNaN(numericHops)) {
      expressApp.set('trust proxy', numericHops);
    } else if (trustProxySetting === 'true') {
      expressApp.set('trust proxy', true);
    } else {
      expressApp.set('trust proxy', false);
    }
  }

  // 3. Compressao de respostas
  app.use(compression());

  // 4. Limites de carga util contra ataques de DoS por memoria
  app.use(express.json({ limit: '64kb' }));
  app.use(express.urlencoded({ limit: '64kb', extended: false }));

  // 4.1 Servir arquivos estaticos da pasta public
  const publicDir = path.join(process.cwd(), 'public');
  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
  }

  // 5. Middleware de seguranca de cabecalhos customizados e CSP diferenciada
  app.use((req: Request, res: Response, next: NextFunction) => {
    const isSwagger =
      req.path === '/' ||
      req.path === '/docs' ||
      req.path.startsWith('/docs/') ||
      req.path.startsWith('/swagger');

    const frameAncestors =
      process.env.CSP_HEADER_VALUE ||
      (!isProduction
        ? "frame-ancestors 'self' https://*.google.com https://*.run.app"
        : "frame-ancestors 'self'");

    if (isSwagger) {
      res.setHeader(
        'Content-Security-Policy',
        `default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; img-src 'self' data: https:; connect-src 'self' *; ${frameAncestors};`,
      );
    } else {
      res.setHeader(
        'Content-Security-Policy',
        `default-src 'none'; ${frameAncestors}; base-uri 'none'; form-action 'none';`,
      );
      if (isProduction && !process.env.CSP_HEADER_VALUE) {
        res.setHeader('X-Frame-Options', 'DENY');
      }
    }

    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), camera=(), microphone=(), payment=(), usb=()',
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');

    next();
  });

  // 6. Helmet com politicas reforcadas
  app.use(
    helmet({
      contentSecurityPolicy: false,
      frameguard: false,
      hidePoweredBy: true,
      hsts: isProduction
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          }
        : false,
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      referrerPolicy: { policy: 'no-referrer' },
      crossOriginResourcePolicy: isProduction ? { policy: 'same-origin' } : false,
      crossOriginOpenerPolicy: isProduction ? { policy: 'same-origin' } : false,
    }),
  );

  // 7. CORS endurecido: allowlist estrita e rejeicao de curinga em producao
  const rawCorsOrigin = process.env.CORS_ORIGIN;
  let corsOrigin: boolean | string | string[] | RegExp = false;

  if (!isProduction) {
    corsOrigin = true;
  } else if (!rawCorsOrigin) {
    corsOrigin = false;
  } else if (rawCorsOrigin === '*') {
    appLogger.warn(
      'Alerta AppSec: CORS_ORIGIN configurado com curinga (*) em producao.',
      'Bootstrap',
    );
    corsOrigin = '*';
  } else {
    corsOrigin = rawCorsOrigin
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
  }

  app.enableCors({
    origin: corsOrigin,
    credentials: false,
    methods: ['GET', 'HEAD', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'X-API-Key',
      'Authorization',
      'X-Request-Id',
    ],
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'Retry-After',
      'X-Request-Id',
    ],
    maxAge: 86400,
  });

  // 8. Middleware de seguranca de parametros (HPP, request ID, limits)
  const securityMiddleware = new SecurityMiddleware();
  app.use((req: Request, res: Response, next: NextFunction) => {
    securityMiddleware.use(req, res, next);
  });

  // 9. Pipeline global de validacao de entrada
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: true,
      disableErrorMessages: isProduction,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
    }),
  );

  // 10. Filtro global de excecoes
  app.useGlobalFilters(new HttpExceptionFilter());

  // 11. Swagger UI com protecao
  setupSwagger(app);
}
