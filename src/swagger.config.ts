import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { appLogger } from './common/services/logger.service';

export function setupSwagger(app: INestApplication) {
  const isProduction = process.env.NODE_ENV === 'production';
  const swaggerEnabled =
    process.env.SWAGGER_ENABLED === 'true' ||
    (!isProduction && process.env.SWAGGER_ENABLED !== 'false');

  if (!swaggerEnabled) {
    appLogger.log(
      'Swagger UI desabilitado por configuracao de seguranca.',
      'Swagger',
    );
    return;
  }

  const httpAdapter = app.getHttpAdapter();

  // Basic Auth para Swagger em producao (requisito 16)
  const swaggerUser = process.env.SWAGGER_USER;
  const swaggerPass = process.env.SWAGGER_PASSWORD;

  if (isProduction && swaggerUser && swaggerPass) {
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
      'API REST de alta performance para catálogo e streaming de rádios brasileiras.',
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
    ],
    customSiteTitle: 'RadiosWave API - Documentação',
    swaggerOptions: {
      // persistAuthorization desativado em producao para evitar chave no localStorage
      persistAuthorization: !isProduction,
      displayRequestDuration: true,
    },
  };

  SwaggerModule.setup('/', app, document, swaggerOptions);
  SwaggerModule.setup('/docs', app, document, swaggerOptions);
}
