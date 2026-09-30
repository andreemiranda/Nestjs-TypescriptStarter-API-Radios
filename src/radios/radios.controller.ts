import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiSecurity,
} from '@nestjs/swagger';
import { RadiosService } from './radios.service';
import { QueryRadiosDto } from './dto/query-radios.dto';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { cleanParam } from '../common/utils/sanitize.util';
import { isValid14DigitId } from '../common/utils/id.util';

@ApiTags('Radios')
@ApiSecurity('X-API-Key')
@ApiSecurity('API_KEY')
@Controller('api/radios')
@UseGuards(ApiKeyGuard)
export class RadiosController {
  constructor(private readonly radiosService: RadiosService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar rádios com paginação, filtros e ordenação',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de estações de rádio',
  })
  @ApiResponse({ status: 400, description: 'Parâmetros de query inválidos' })
  @ApiResponse({ status: 401, description: 'Chave de API ausente ou inválida' })
  @ApiResponse({
    status: 503,
    description: 'API Key não configurada no servidor',
  })
  findAll(@Query() query: QueryRadiosDto) {
    return this.radiosService.findAll(query);
  }

  @Get('meta')
  @ApiOperation({
    summary: 'Obter metadados (lista de estados, tags e total de rádios)',
  })
  @ApiResponse({ status: 200, description: 'Metadados do catálogo' })
  @ApiResponse({ status: 401, description: 'Chave de API ausente ou inválida' })
  getMeta() {
    return this.radiosService.getMeta();
  }

  @Get('states')
  @ApiOperation({ summary: 'Obter lista de estados disponíveis' })
  @ApiResponse({ status: 200, description: 'Array com nomes de estados' })
  @ApiResponse({ status: 401, description: 'Chave de API ausente ou inválida' })
  getStates() {
    return this.radiosService.getMeta().states;
  }

  @Get('tags')
  @ApiOperation({ summary: 'Obter lista de tags e categorias disponíveis' })
  @ApiResponse({ status: 200, description: 'Array com tags' })
  @ApiResponse({ status: 401, description: 'Chave de API ausente ou inválida' })
  getTags() {
    return this.radiosService.getMeta().tags;
  }

  @Get('by-state/:state')
  @ApiOperation({ summary: 'Buscar estações de rádio por estado' })
  @ApiParam({
    name: 'state',
    description: 'Nome do estado brasileiro',
    example: 'Tocantins',
  })
  @ApiResponse({ status: 200, description: 'Estações do estado pesquisado' })
  @ApiResponse({ status: 400, description: 'Parâmetro de estado inválido' })
  @ApiResponse({ status: 401, description: 'Chave de API ausente ou inválida' })
  findByState(@Param('state') state: string) {
    const cleaned = cleanParam(state);
    if (!cleaned || cleaned.length > 50) {
      throw new BadRequestException('Invalid state parameter');
    }
    const result = this.radiosService.findByState(cleaned);
    return { data: result, total: result.length };
  }

  @Get('by-tag/:tag')
  @ApiOperation({ summary: 'Buscar estações de rádio por tag' })
  @ApiParam({
    name: 'tag',
    description: 'Nome da tag ou gênero musical',
    example: 'popular',
  })
  @ApiResponse({ status: 200, description: 'Estações com a tag informada' })
  @ApiResponse({ status: 400, description: 'Parâmetro de tag inválido' })
  @ApiResponse({ status: 401, description: 'Chave de API ausente ou inválida' })
  findByTag(@Param('tag') tag: string) {
    const cleaned = cleanParam(tag);
    if (!cleaned || cleaned.length > 50) {
      throw new BadRequestException('Invalid tag parameter');
    }
    const result = this.radiosService.findByTag(cleaned);
    return { data: result, total: result.length };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Buscar estação de rádio por identificador ID de 14 dígitos',
  })
  @ApiParam({
    name: 'id',
    description:
      'ID numérico de 14 dígitos (sem dígito 0 e sem dígitos repetidos consecutivamente)',
    example: '49639317164246',
  })
  @ApiResponse({ status: 200, description: 'Detalhes da estação de rádio' })
  @ApiResponse({
    status: 400,
    description:
      'ID inválido (deve possuir 14 dígitos, sem 0 e sem dígitos repetidos consecutivamente)',
  })
  @ApiResponse({ status: 401, description: 'Chave de API ausente ou inválida' })
  @ApiResponse({ status: 404, description: 'Estação de rádio não encontrada' })
  findOne(@Param('id') id: string) {
    if (!isValid14DigitId(id)) {
      throw new BadRequestException(
        'O parâmetro ID deve possuir 14 dígitos, sem o dígito zero (0) e sem dígitos repetidos consecutivamente',
      );
    }
    const numericId = Number(id);
    const radio = this.radiosService.findOne(numericId);
    if (!radio) {
      throw new NotFoundException(`Radio with id ${id} not found`);
    }
    return radio;
  }
}
