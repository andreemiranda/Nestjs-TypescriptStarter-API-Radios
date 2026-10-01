import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap/configure-app';
import { appLogger } from './common/services/logger.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: appLogger,
  });

  app.enableShutdownHooks();

  configureApp(app);

  const port = 3000;
  await app.listen(port, '0.0.0.0');
  appLogger.log(`Servidor iniciado com sucesso na porta ${port}`, 'Bootstrap');
}
void bootstrap();
