import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly reflector?: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector?.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();
    const reqPath = request.path || request.url || '';

    // /api/health is always public
    if (
      isPublic ||
      reqPath === '/api/health' ||
      reqPath === '/api/health/' ||
      reqPath.startsWith('/api/health?') ||
      reqPath.startsWith('/api/health/')
    ) {
      return true;
    }

    const expectedKey = process.env.API_KEY;
    if (!expectedKey) {
      throw new ServiceUnavailableException(
        'API key not configured on the server',
      );
    }

    const headerValue = request.headers['x-api-key'];
    const queryValue =
      (request.query?.['API_KEY'] as string | undefined) ||
      (request.query?.['api_key'] as string | undefined);
    const provided = headerValue || queryValue;
    const providedKey = Array.isArray(provided) ? provided[0] : provided;

    if (!providedKey) {
      throw new UnauthorizedException(
        'Missing X-API-Key header or API_KEY query parameter',
      );
    }

    if (typeof providedKey !== 'string') {
      throw new UnauthorizedException('Invalid API key');
    }

    const validKeys = [expectedKey];
    if (
      process.env.SYSTEM_API_KEY &&
      !validKeys.includes(process.env.SYSTEM_API_KEY)
    ) {
      validKeys.push(process.env.SYSTEM_API_KEY);
    }

    try {
      const envPath = path.join(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const fileContent = fs.readFileSync(envPath, 'utf-8');
        const match = fileContent.match(/^API_KEY=(.*)$/m);
        if (match && match[1]) {
          const fileKey = match[1].trim();
          if (fileKey && !validKeys.includes(fileKey)) {
            validKeys.push(fileKey);
          }
        }
      }
    } catch {
      // ignore
    }

    // Cryptographic constant-time hash comparison to defeat any timing attacks
    const trimmedProvided = providedKey.trim();
    const providedHash = crypto
      .createHash('sha256')
      .update(trimmedProvided)
      .digest();

    const matches = validKeys.some((key) => {
      const trimmedKey = key.trim();
      const expectedHash = crypto
        .createHash('sha256')
        .update(trimmedKey)
        .digest();
      return crypto.timingSafeEqual(expectedHash, providedHash);
    });

    if (!matches) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Protect against downstream proxy and client cache retention of sensitive data
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
