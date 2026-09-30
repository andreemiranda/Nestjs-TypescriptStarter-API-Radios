import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

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

    let error = 'Internal Server Error';
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
        error = exception.name || 'Error';
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        if (resObj.error && typeof resObj.error === 'string') {
          error = resObj.error;
        } else {
          error = exception.name || 'Error';
        }

        if (resObj.message) {
          message = resObj.message as string | string[];
        }
      }
    } else if (exception instanceof Error) {
      // Avoid leaking internal error details or stack traces
      message =
        process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : exception.message;
    }

    // Mask sensitive API keys and secrets from the path to prevent credential exposure
    const safePath = this.sanitizePath(request.url || '');

    response.status(status).json({
      statusCode: status,
      error,
      message,
      path: safePath,
      timestamp: new Date().toISOString(),
    });
  }

  private sanitizePath(url: string): string {
    return url.replace(
      /([?&](?:API_KEY|api_key|key|token|secret)=)[^&]*/gi,
      '$1[REDACTED]',
    );
  }
}
