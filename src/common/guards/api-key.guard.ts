import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expectedKey = process.env.API_KEY;
    if (!expectedKey) {
      throw new ServiceUnavailableException(
        'API key not configured on the server',
      );
    }

    const request = context.switchToHttp().getRequest();
    const providedKey: string | undefined = request.headers['x-api-key'];

    if (!providedKey) {
      throw new UnauthorizedException('Missing X-API-Key header');
    }

    if (
      typeof providedKey !== 'string' ||
      providedKey.length !== expectedKey.length
    ) {
      throw new UnauthorizedException('Invalid API key');
    }

    const expectedBuffer = Buffer.from(expectedKey);
    const providedBuffer = Buffer.from(providedKey);
    if (!crypto.timingSafeEqual(expectedBuffer, providedBuffer)) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}
