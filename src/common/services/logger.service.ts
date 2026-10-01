import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import pino from 'pino';

export interface SecurityEventData {
  event: 'AUTH_FAILURE' | 'RATE_LIMIT_EXCEEDED' | 'VALIDATION_FAILED' | 'SECURITY_BLOCKED' | 'SUSPICIOUS_PROBE';
  ip?: string;
  path?: string;
  method?: string;
  correlationId?: string;
  keyId?: string;
  reason?: string;
  details?: Record<string, unknown>;
}

@Injectable()
export class AppLoggerService implements NestLoggerService {
  private readonly logger: pino.Logger;

  constructor() {
    this.logger = pino({
      level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers["x-api-key"]',
          'req.headers.cookie',
          'headers.authorization',
          'headers["x-api-key"]',
          'headers.cookie',
          'query.API_KEY',
          'query.api_key',
          '*.API_KEY',
          '*.api_key',
          '*.password',
          '*.secret',
          '*.token',
        ],
        censor: '[REDACTED]',
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level(label: string) {
          return { level: label };
        },
      },
      base: {
        env: process.env.NODE_ENV || 'development',
      },
    });
  }

  log(message: string, context?: string) {
    this.logger.info({ context }, message);
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error({ context, trace }, message);
  }

  warn(message: string, context?: string) {
    this.logger.warn({ context }, message);
  }

  debug(message: string, context?: string) {
    this.logger.debug({ context }, message);
  }

  verbose(message: string, context?: string) {
    this.logger.trace({ context }, message);
  }

  logSecurityEvent(data: SecurityEventData) {
    this.logger.warn({ securityEvent: data }, `Security alert: ${data.event} - ${data.reason || 'No details'}`);
  }

  getPino(): pino.Logger {
    return this.logger;
  }
}

export const appLogger = new AppLoggerService();
