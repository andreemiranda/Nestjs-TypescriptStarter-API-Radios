import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';

@ApiTags('System')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('api/health')
  @Public()
  @ApiOperation({ summary: 'Endpoint de verificação de saúde da aplicação' })
  @ApiResponse({
    status: 200,
    description: 'Aplicação operando normalmente',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2026-09-30T10:00:00.000Z' },
      },
    },
  })
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('api/info')
  @Public()
  @ApiOperation({ summary: 'Informações gerais e catálogo de endpoints da API' })
  @ApiResponse({ status: 200, description: 'Metadados da API' })
  getApiInfo(): Record<string, unknown> {
    return this.appService.getApiInfo();
  }
}
