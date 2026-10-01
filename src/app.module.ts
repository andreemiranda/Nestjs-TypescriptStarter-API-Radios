import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RadiosModule } from './radios/radios.module';
import { ApiKeyService } from './common/services/api-key.service';
import { AuthBruteForceService } from './common/services/auth-brute-force.service';
import { AppLoggerService } from './common/services/logger.service';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      useFactory: () => {
        const ttl = process.env.THROTTLE_TTL
          ? parseInt(process.env.THROTTLE_TTL, 10)
          : 60000;
        const limit = process.env.THROTTLE_LIMIT
          ? parseInt(process.env.THROTTLE_LIMIT, 10)
          : 120;

        return [
          {
            name: 'default',
            ttl,
            limit,
          },
        ];
      },
    }),
    RadiosModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ApiKeyService,
    AuthBruteForceService,
    AppLoggerService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [ApiKeyService, AuthBruteForceService, AppLoggerService],
})
export class AppModule {}
