import {
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiSecurity,
  ApiProduces,
} from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';
import { ApiKeyGuard } from './common/guards/api-key.guard';

const SWAGGER_FAVICON_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAkFBMVEUAAAAQM0QWNUYWNkYXNkYALjoWNUYYOEUXN0YaPEUPMUAUM0QVNUYWNkYWNUYWNUUWNUYVNEYWNkYWNUYWM0eF6i0XNkchR0OB5SwzZj9wyTEvXkA3az5apTZ+4C5DgDt31C9frjU5bz5uxTI/eDxzzjAmT0IsWUEeQkVltzR62S6D6CxIhzpKijpJiDpOkDl4b43lAAAAFXRSTlMAFc304QeZ/vj+ECB3xKlGilPXvS2Ka/h0AAABfklEQVR42oVT2XaCMBAdJRAi7pYJa2QHxbb//3ctSSAUPfa+THLmzj4DBvZpvyauS9b7kw3PWDkWsrD6fFQhQ9dZLfVbC5M88CWCPERr+8fLZodJ5M8QJbjbGL1H2M1fIGfEm+wJN+bGCSc6EXtNS/8FSrq2VX6YDv++XLpJ8SgDWMnwqznGo6alcTbIxB2CHKn8VFikk2mMV2lEnV+CJd9+jJlxXmMr5dW14YCqwgbFpO8FNvJxwwM4TPWPo5QalEsRMAcusXpi58/QUEWPL0AK1ThM5oQCUyXPoPINkdd922VBw4XgTV9zDGWWFrgjIQs4vwvOg6xr+6gbCTqE+DYhlMGX0CF2OknK5gQ2JrkDh/W6TOEbYDeVecKbJtyNXiCfGmW7V93J2hDus1bDfhxWbIZVYDXITA7Lo6E0Ktgg9eB4KWuR44aj7ppBVPazhQH7/M/KgWe9X1qAg8XypT6nxIMJH+T94QCsLvj29IYwZxyO9/F8vCbO9tX5/wDGjEZ7vrgFZwAAAABJRU5ErkJggg==';

const SWAGGER_FAVICON_BUFFER = Buffer.from(SWAGGER_FAVICON_BASE64, 'base64');

@ApiTags('System')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('.well-known/security.txt')
  @Public()
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @ApiProduces('text/plain')
  @ApiOperation({
    summary: 'Informações de contato e política de segurança (RFC 9116)',
  })
  getSecurityTxt(): string {
    return this.appService.getSecurityTxt();
  }

  @Get('robots.txt')
  @Public()
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @ApiProduces('text/plain')
  @ApiOperation({
    summary: 'Diretrizes para rastreadores e robôs (robots.txt)',
  })
  getRobotsTxt(): string {
    return this.appService.getRobotsTxt();
  }

  @Get('favicon.ico')
  @Public()
  @ApiOperation({ summary: 'Favicon do Swagger UI (favicon.ico)' })
  getFavicon(@Res() res: ExpressResponse): void {
    res.setHeader('Content-Type', 'image/x-icon');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(SWAGGER_FAVICON_BUFFER);
  }

  @Get('favicon-32x32.png')
  @Public()
  @ApiOperation({ summary: 'Favicon do Swagger UI (32x32 PNG)' })
  getFavicon32(@Res() res: ExpressResponse): void {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(SWAGGER_FAVICON_BUFFER);
  }

  @Get('favicon-16x16.png')
  @Public()
  @ApiOperation({ summary: 'Favicon do Swagger UI (16x16 PNG)' })
  getFavicon16(@Res() res: ExpressResponse): void {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(SWAGGER_FAVICON_BUFFER);
  }

  @Get('docs/favicon-32x32.png')
  @Public()
  getDocsFavicon32(@Res() res: ExpressResponse): void {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(SWAGGER_FAVICON_BUFFER);
  }

  @Get('docs/favicon-16x16.png')
  @Public()
  getDocsFavicon16(@Res() res: ExpressResponse): void {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(SWAGGER_FAVICON_BUFFER);
  }

  @Get('api/health')
  @Public()
  @ApiOperation({ summary: 'Verificação pública de saúde do serviço' })
  @ApiResponse({
    status: 200,
    description: 'Serviço operacional',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
      },
    },
  })
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('api/health/detailed')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('X-API-Key')
  @ApiSecurity('BearerAuth')
  @ApiOperation({
    summary: 'Diagnóstico detalhado de saúde (protegido por chave)',
  })
  @ApiResponse({ status: 200, description: 'Metricas detalhadas do sistema' })
  @ApiResponse({ status: 401, description: 'Autenticação necessária' })
  getDetailedHealth() {
    return this.appService.getDetailedHealth();
  }

  @Get('api/info')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('X-API-Key')
  @ApiSecurity('BearerAuth')
  @ApiOperation({
    summary: 'Informações gerais da API (protegido por chave)',
  })
  @ApiResponse({ status: 200, description: 'Metadados da API' })
  @ApiResponse({ status: 401, description: 'Autenticação necessária' })
  getApiInfo(): Record<string, unknown> {
    return this.appService.getApiInfo();
  }
}
