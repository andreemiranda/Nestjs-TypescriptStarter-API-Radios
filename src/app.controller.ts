import {
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
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
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Favicon handler (204 No Content)' })
  getFavicon(): void {
    return;
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
