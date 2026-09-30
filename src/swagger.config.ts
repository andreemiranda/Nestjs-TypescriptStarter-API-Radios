import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication) {
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
        description: 'Chave de autenticação enviada no cabeçalho HTTP X-API-Key',
      },
      'X-API-Key',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'API_KEY',
        in: 'query',
        description:
          'Chave de autenticação enviada na query string ?API_KEY=<chave>',
      },
      'API_KEY',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  const customCss = `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 25px 0 }
    .swagger-ui .info .title { font-family: system-ui, -apple-system, sans-serif; font-size: 28px }
    body { background-color: #f8fafc; margin: 0; padding: 0 }
  `;

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
      persistAuthorization: true,
      displayRequestDuration: true,
    },
  };

  // Serve on both / and /docs
  SwaggerModule.setup('/', app, document, swaggerOptions);
  SwaggerModule.setup('/docs', app, document, swaggerOptions);
}
