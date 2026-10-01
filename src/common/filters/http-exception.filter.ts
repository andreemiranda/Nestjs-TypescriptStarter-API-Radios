import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { appLogger } from '../services/logger.service';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const correlationId =
      (request.headers['x-request-id'] as string) ||
      ((request as unknown as Record<string, unknown>)['correlationId'] as string) ||
      'unknown';

    let error = 'Internal Server Error';
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = this.redactSecrets(res);
        error = exception.name || 'Error';
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        if (resObj.error && typeof resObj.error === 'string') {
          error = this.redactSecrets(resObj.error);
        } else {
          error = exception.name || 'Error';
        }

        if (resObj.message) {
          if (Array.isArray(resObj.message)) {
            message = resObj.message.map((m) => this.redactSecrets(String(m)));
          } else if (typeof resObj.message === 'string') {
            message = this.redactSecrets(resObj.message);
          } else {
            message = 'Bad Request';
          }
        }
      }
    } else if (exception instanceof Error) {
      // Em producao, oculta mensagem de erro interno
      const isProduction = process.env.NODE_ENV === 'production';
      message = isProduction ? 'Internal server error' : this.redactSecrets(exception.message);

      // Registra log com correlationId para rastreamento
      appLogger.error(
        `Excecao nao tratada [${correlationId}]: ${exception.message}`,
        exception.stack,
        'HttpExceptionFilter',
      );
    }

    const safePath = this.sanitizePath(request.url || '');

    response.status(status).json({
      statusCode: status,
      error,
      message,
      path: safePath,
      correlationId,
      timestamp: new Date().toISOString(),
    });
  }

  private sanitizePath(url: string): string {
    return url.replace(
      /([?&](?:API_KEY|api_key|key|token|secret|password)=)[^&]*/gi,
      '$1[REDACTED]',
    );
  }

  private redactSecrets(str: string): string {
    return str.replace(
      /(?:API_KEY|api_key|key|token|secret|password)[=:]\s*([^\s,;]+)/gi,
      'key=[REDACTED]',
    );
  }
}
