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

  const port = process.env.DEFAULT_APP_PORT
    ? parseInt(process.env.DEFAULT_APP_PORT, 10)
    : process.env.PORT && process.env.PORT !== '8080'
      ? parseInt(process.env.PORT, 10)
      : 3000;
  await app.listen(port, '0.0.0.0');
  appLogger.log(`Servidor iniciado com sucesso na porta ${port}`, 'Bootstrap');
}
void bootstrap();
