import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ApiKeyService } from '../services/api-key.service';
import { AuthBruteForceService } from '../services/auth-brute-force.service';
import { appLogger } from '../services/logger.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    @Optional() private readonly reflector?: Reflector,
    @Optional() private readonly apiKeyService?: ApiKeyService,
    @Optional() private readonly bruteForceService?: AuthBruteForceService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector?.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();
    const reqPath = request.path || request.url || '';
    const clientIp = request.ip || request.socket.remoteAddress || 'unknown';

    // Apenas /api/health estrito e publico; /api/health/detailed e protegido
    const isPublicHealth =
      reqPath === '/api/health' ||
      reqPath === '/api/health/' ||
      reqPath.startsWith('/api/health?');

    if (isPublic || isPublicHealth) {
      return true;
    }

    const bruteService = this.bruteForceService || new AuthBruteForceService();
    const keyService = this.apiKeyService || new ApiKeyService();

    // 1. Verifica se o IP esta bloqueado por forca bruta
    const blockStatus = bruteService.isBlocked(clientIp);
    if (blockStatus.blocked) {
      const retrySec = blockStatus.retryAfterSeconds || 60;
      if (response && typeof response.setHeader === 'function') {
        response.setHeader('Retry-After', retrySec);
      }
      appLogger.logSecurityEvent({
        event: 'AUTH_FAILURE',
        ip: clientIp,
        path: reqPath,
        method: request.method,
        reason:
          'Client IP bloqueado temporariamente por excesso de tentativas invalidas',
      });
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message:
            'Muitas tentativas invalidas de autenticacao. Tente novamente mais tarde.',
          retryAfter: retrySec,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 2. Extrai a chave dos cabecalhos ou query string
    let rawKey: string | undefined;

    // Prioridade 1: Cabecalho X-API-Key
    const xApiKey = request.headers['x-api-key'];
    if (xApiKey) {
      rawKey = Array.isArray(xApiKey) ? xApiKey[0] : xApiKey;
    }

    // Prioridade 2: Cabecalho Authorization: Bearer <key>
    if (!rawKey && request.headers.authorization) {
      const authHeader = request.headers.authorization;
      const parts = authHeader.split(' ');
      if (parts.length === 2 && /^bearer$/i.test(parts[0])) {
        rawKey = parts[1];
      }
    }

    // Prioridade 3: Query String (?API_KEY= ou ?api_key=)
    if (!rawKey) {
      const extractedQueryKey =
        (request as unknown as Record<string, unknown>)['queryApiKey'] ||
        request.query?.['API_KEY'] ||
        request.query?.['api_key'];

      if (extractedQueryKey) {
        rawKey = Array.isArray(extractedQueryKey)
          ? (extractedQueryKey[0] as string)
          : (extractedQueryKey as string);
      }
    }

    // 3. Verifica se a chave foi fornecida
    if (!rawKey || typeof rawKey !== 'string' || rawKey.trim().length === 0) {
      const failureResult = bruteService.recordFailure(clientIp);
      appLogger.logSecurityEvent({
        event: 'AUTH_FAILURE',
        ip: clientIp,
        path: reqPath,
        method: request.method,
        reason: 'Chave de API ausente',
      });

      if (failureResult.blocked) {
        if (response && typeof response.setHeader === 'function') {
          response.setHeader(
            'Retry-After',
            failureResult.retryAfterSeconds || 60,
          );
        }
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            error: 'Too Many Requests',
            message: 'Muitas tentativas invalidas. Tente novamente mais tarde.',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      throw new UnauthorizedException(
        'Missing X-API-Key header, Authorization Bearer token, or API_KEY query parameter',
      );
    }

    // 4. Valida a chave utilizando o ApiKeyService
    if (!keyService.hasConfiguredKeys()) {
      keyService.loadKeysFromEnvironment();
    }

    if (!keyService.hasConfiguredKeys()) {
      throw new ServiceUnavailableException(
        'API key not configured on the server',
      );
    }

    const validation = keyService.validateKey(rawKey);
    if (!validation.valid) {
      const failureResult = bruteService.recordFailure(clientIp);
      appLogger.logSecurityEvent({
        event: 'AUTH_FAILURE',
        ip: clientIp,
        path: reqPath,
        method: request.method,
        reason: validation.reason || 'Chave de API invalida',
        keyId: validation.keyId,
      });

      if (failureResult.blocked) {
        if (response && typeof response.setHeader === 'function') {
          response.setHeader(
            'Retry-After',
            failureResult.retryAfterSeconds || 60,
          );
        }
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            error: 'Too Many Requests',
            message: 'Muitas tentativas invalidas. Tente novamente mais tarde.',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      if (validation.reason === 'EXPIRED_KEY') {
        throw new UnauthorizedException('API key has expired');
      }

      if (validation.reason === 'INACTIVE_KEY') {
        throw new UnauthorizedException('API key is inactive');
      }

      throw new UnauthorizedException('Invalid API key');
    }

    // Sucesso na autenticacao: reseta historico de forca bruta para este IP
    bruteService.recordSuccess(clientIp);

    // Registra identificador do cliente na requisicao para auditoria e logs
    (request as unknown as Record<string, unknown>)['authenticatedKeyId'] =
      validation.keyId;

    // Headers de protecao de cache para respostas autenticadas
    if (response && typeof response.setHeader === 'function') {
      response.setHeader(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate',
      );
      response.setHeader('Pragma', 'no-cache');
    }

    return true;
  }
}
