import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { appLogger } from './common/services/logger.service';

export function setupSwagger(app: INestApplication) {
  const isProduction = process.env.NODE_ENV === 'production';
  const swaggerEnabled = true;

  if (!swaggerEnabled) {
    return;
  }

  const httpAdapter = app.getHttpAdapter();

  // Basic Auth para Swagger somente se explicitamente requisitado
  const swaggerBasicAuthEnabled = process.env.SWAGGER_BASIC_AUTH === 'true';
  const swaggerUser = process.env.SWAGGER_USER;
  const swaggerPass = process.env.SWAGGER_PASSWORD;

  if (swaggerBasicAuthEnabled && swaggerUser && swaggerPass) {
    const authMiddleware = (
      req: Request,
      res: Response,
      next: NextFunction,
    ) => {
      const isSwaggerPath =
        req.path === '/' ||
        req.path === '/docs' ||
        req.path.startsWith('/docs/') ||
        req.path.startsWith('/swagger');

      if (!isSwaggerPath) {
        return next();
      }

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Basic ')) {
        res.setHeader(
          'WWW-Authenticate',
          'Basic realm="RadiosWave API Documentation"',
        );
        res
          .status(401)
          .send('Authentication required for Swagger documentation');
        return;
      }

      const base64Creds = authHeader.split(' ')[1];
      const decoded = Buffer.from(base64Creds, 'base64').toString('utf-8');
      const colonIdx = decoded.indexOf(':');
      if (colonIdx === -1) {
        res.status(401).send('Invalid credentials format');
        return;
      }

      const user = decoded.slice(0, colonIdx);
      const pass = decoded.slice(colonIdx + 1);

      const userMatch = crypto.timingSafeEqual(
        crypto.createHash('sha256').update(user).digest(),
        crypto.createHash('sha256').update(swaggerUser).digest(),
      );
      const passMatch = crypto.timingSafeEqual(
        crypto.createHash('sha256').update(pass).digest(),
        crypto.createHash('sha256').update(swaggerPass).digest(),
      );

      if (!userMatch || !passMatch) {
        res.setHeader(
          'WWW-Authenticate',
          'Basic realm="RadiosWave API Documentation"',
        );
        res.status(401).send('Invalid credentials');
        return;
      }

      next();
    };

    httpAdapter.use(authMiddleware);
  }

  const swaggerConfig = new DocumentBuilder()
    .setTitle('RadiosWave API')
    .setDescription(
      'API REST de alta performance para catálogo e streaming de rádios brasileiras.\n\n' +
        '🔑 **Chave de Desenvolvimento**: Em ambiente de desenvolvimento/testes, utilize: `radioswave-dev-test-key-2026-secure` (clique no botão **Authorize** acima ou envie no cabeçalho `X-API-Key` ou `Authorization: Bearer <chave>`).',
    )
    .setVersion('1.0.0')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
        description:
          'Chave de autenticação enviada no cabeçalho HTTP X-API-Key',
      },
      'X-API-Key',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'API_KEY',
        in: 'query',
        description:
          'Chave de autenticação enviada na query string ?API_KEY=<chave> (depreciada em producao)',
      },
      'API_KEY',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'API-Key',
        description: 'Chave enviada no cabeçalho Authorization: Bearer <chave>',
      },
      'BearerAuth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  const customCss = `
    .swagger-ui .topbar { display: none }
    .radioswave-header {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #ffffff;
      padding: 12px 24px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      position: sticky;
      top: 0;
      z-index: 1000;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .radioswave-header-container {
      max-width: 1460px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }
    .radioswave-brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      color: #ffffff !important;
      text-decoration: none !important;
      font-weight: 700;
      font-size: 18px;
      letter-spacing: -0.02em;
      transition: opacity 0.2s;
    }
    .radioswave-brand:hover {
      opacity: 0.9;
    }
    .radioswave-brand .radioswave-title {
      color: #38bdf8;
    }
    .radioswave-nav {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .radioswave-nav-link {
      color: #94a3b8 !important;
      text-decoration: none !important;
      font-size: 14px;
      font-weight: 500;
      padding: 6px 12px;
      border-radius: 6px;
      transition: all 0.2s;
    }
    .radioswave-nav-link:hover {
      color: #ffffff !important;
      background: rgba(255, 255, 255, 0.08);
    }
    .radioswave-nav-badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 9999px;
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8 !important;
      border: 1px solid rgba(56, 189, 248, 0.3);
      text-decoration: none !important;
      transition: all 0.2s;
    }
    .radioswave-nav-badge:hover {
      background: rgba(56, 189, 248, 0.25);
    }
    .radioswave-home-link {
      color: #0f172a !important;
      text-decoration: none !important;
      border-bottom: 2px solid #38bdf8;
      transition: color 0.2s, border-color 0.2s;
    }
    .radioswave-home-link:hover {
      color: #0284c7 !important;
      border-color: #0284c7;
    }
    .swagger-ui .info { margin: 25px 0 }
    .swagger-ui .info .title { font-family: system-ui, -apple-system, sans-serif; font-size: 28px }
    body { background-color: #f8fafc; margin: 0; padding: 0 }
  `;

  // Scripts e estilos CDN com integridade de sub-recurso (SRI)
  const swaggerOptions = {
    customCss,
    customCssUrl: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-standalone-preset.min.css',
    ],
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-standalone-preset.min.js',
      '/custom-header.js',
    ],
    customSiteTitle: 'RadiosWave API - Documentação',
    customfavIcon: '/favicon-32x32.png',
    swaggerOptions: {
      // persistAuthorization desativado em producao para evitar chave no localStorage
      persistAuthorization: !isProduction,
      displayRequestDuration: true,
    },
  };

  SwaggerModule.setup('/', app, document, swaggerOptions);
  SwaggerModule.setup('/docs', app, document, swaggerOptions);
}
