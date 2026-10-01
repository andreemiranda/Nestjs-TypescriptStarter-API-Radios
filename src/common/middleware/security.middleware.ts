import { Injectable, NestMiddleware, BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly maxUrlLength = 2048;
  private readonly maxQueryLength = 1024;

  use(req: Request, res: Response, next: NextFunction) {
    // 1. Gera ou valida correlation ID (X-Request-Id)
    const incomingRequestId = req.headers['x-request-id'];
    let correlationId: string;

    if (
      typeof incomingRequestId === 'string' &&
      incomingRequestId.length > 0 &&
      incomingRequestId.length <= 64 &&
      /^[a-zA-Z0-9\-_]+$/.test(incomingRequestId)
    ) {
      correlationId = incomingRequestId;
    } else {
      correlationId = crypto.randomUUID();
    }

    req.headers['x-request-id'] = correlationId;
    (req as unknown as Record<string, unknown>)['correlationId'] = correlationId;
    res.setHeader('X-Request-Id', correlationId);

    // 2. Limite de tamanho da URL
    const fullUrl = req.originalUrl || req.url || '';
    if (fullUrl.length > this.maxUrlLength) {
      throw new PayloadTooLargeException('URL excede o limite maximo permitido.');
    }

    // 3. Limite de tamanho da query string
    const queryIndex = fullUrl.indexOf('?');
    if (queryIndex !== -1) {
      const queryString = fullUrl.slice(queryIndex + 1);
      if (queryString.length > this.maxQueryLength) {
        throw new PayloadTooLargeException('Query string excede o limite maximo permitido.');
      }
    }

    // 4. Protecao contra HTTP Parameter Pollution (HPP) e injecao de objetos
    if (req.query && typeof req.query === 'object') {
      const queryCopy: Record<string, unknown> = { ...req.query };

      // Extrai chaves de API da query string para desacoplar da validacao de DTOs
      if ('API_KEY' in queryCopy) {
        const rawKey = queryCopy['API_KEY'];
        let keyVal = '';
        if (typeof rawKey === 'string') {
          keyVal = rawKey;
        } else if (Array.isArray(rawKey) && typeof rawKey[0] === 'string') {
          keyVal = rawKey[0];
        }
        (req as unknown as Record<string, unknown>)['queryApiKey'] = keyVal;
        delete queryCopy['API_KEY'];
      }
      if ('api_key' in queryCopy) {
        const rawKey = queryCopy['api_key'];
        let keyVal = '';
        if (typeof rawKey === 'string') {
          keyVal = rawKey;
        } else if (Array.isArray(rawKey) && typeof rawKey[0] === 'string') {
          keyVal = rawKey[0];
        }
        (req as unknown as Record<string, unknown>)['queryApiKey'] = keyVal;
        delete queryCopy['api_key'];
      }

      // Redefine a propriedade query com o objeto limpo
      Object.defineProperty(req, 'query', {
        value: queryCopy,
        writable: true,
        enumerable: true,
        configurable: true,
      });

      for (const [key, value] of Object.entries(queryCopy)) {
        if (Array.isArray(value)) {
          throw new BadRequestException(
            `Parametro de consulta repetido '${key}' nao permitido (HTTP Parameter Pollution).`,
          );
        }
        if (value !== null && typeof value === 'object') {
          throw new BadRequestException(
            `Objeto aninhado no parametro '${key}' nao permitido.`,
          );
        }
      }
    }

    // 5. Restricao de metodos HTTP permitidos (API estritamente somente leitura)
    const allowedMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (!allowedMethods.includes(req.method.toUpperCase())) {
      res.setHeader('Allow', allowedMethods.join(', '));
      res.status(405).json({
        statusCode: 405,
        error: 'Method Not Allowed',
        message: `Metodo HTTP '${req.method}' nao permitido. Esta API e estritamente somente leitura.`,
        path: req.path,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  }
}
