import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiSecurity,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { RadiosService } from './radios.service';
import { QueryRadiosDto } from './dto/query-radios.dto';
import { QueryByCategoryDto } from './dto/query-by-category.dto';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { RadioIdPipe } from '../common/pipes/radio-id.pipe';
import { RadioStatePipe } from '../common/pipes/radio-state.pipe';
import { RadioTagPipe } from '../common/pipes/radio-tag.pipe';
import { RadioPagePipe } from '../common/pipes/radio-page.pipe';

@ApiTags('Radios')
@ApiSecurity('X-API-Key')
@ApiSecurity('BearerAuth')
@ApiSecurity('API_KEY')
@Controller('api/radios')
@UseGuards(ApiKeyGuard)
export class RadiosController {
  constructor(private readonly radiosService: RadiosService) {}

  @Get()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({
    summary: 'Listar rádios com paginação, filtros e ordenação',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de estações de rádio',
  })
  @ApiResponse({ status: 400, description: 'Parâmetros de query inválidos' })
  @ApiResponse({ status: 401, description: 'Chave de API ausente ou inválida' })
  @ApiResponse({ status: 429, description: 'Limite de requisições excedido' })
  findAll(@Query() query: QueryRadiosDto) {
    return this.radiosService.findAll(query);
  }

  @Get('meta')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({
    summary: 'Obter metadados (lista de estados, tags e total de rádios)',
  })
  @ApiResponse({ status: 200, description: 'Metadados do catálogo' })
  @ApiResponse({ status: 401, description: 'Chave de API ausente ou inválida' })
  getMeta() {
    return this.radiosService.getMeta();
  }

  @Get('states')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Obter lista de estados disponíveis' })
  @ApiResponse({ status: 200, description: 'Array com nomes de estados' })
  @ApiResponse({ status: 401, description: 'Chave de API ausente ou inválida' })
  getStates() {
    return this.radiosService.getMeta().states;
  }

  @Get('tags')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Obter lista de tags e categorias disponíveis' })
  @ApiResponse({ status: 200, description: 'Array com tags' })
  @ApiResponse({ status: 401, description: 'Chave de API ausente ou inválida' })
  getTags() {
    return this.radiosService.getMeta().tags;
  }

  @Get('by-state/:state')
  @Throttle({ default: { limit: 40, ttl: 60000 } })
  @ApiOperation({ summary: 'Buscar estações de rádio por estado (paginado)' })
  @ApiParam({
    name: 'state',
    description: 'Nome do estado brasileiro',
    example: 'Tocantins',
  })
  @ApiResponse({ status: 200, description: 'Estações do estado pesquisado' })
  @ApiResponse({ status: 400, description: 'Parâmetro de estado inválido' })
  @ApiResponse({ status: 401, description: 'Chave de API ausente ou inválida' })
  findByState(
    @Param('state', RadioStatePipe) state: string,
    @Query() query: QueryByCategoryDto,
  ) {
    return this.radiosService.findByState(state, query.page, query.limit);
  }

  @Get('by-tag/:tag')
  @Throttle({ default: { limit: 40, ttl: 60000 } })
  @ApiOperation({ summary: 'Buscar estações de rádio por tag (paginado)' })
  @ApiParam({
    name: 'tag',
    description: 'Nome da tag ou gênero musical',
    example: 'popular',
  })
  @ApiResponse({ status: 200, description: 'Estações com a tag informada' })
  @ApiResponse({ status: 400, description: 'Parâmetro de tag inválido' })
  @ApiResponse({ status: 401, description: 'Chave de API ausente ou inválida' })
  findByTag(
    @Param('tag', RadioTagPipe) tag: string,
    @Query() query: QueryByCategoryDto,
  ) {
    return this.radiosService.findByTag(tag, query.page, query.limit);
  }

  @Get(['page/:page', 'page_:page', 'per_page_:page'])
  @Throttle({ default: { limit: 40, ttl: 60000 } })
  @ApiOperation({
    summary:
      'Acessar rádios paginadas diretamente pelo número da página no caminho da URL (ex: /page/2, /page_2, /per_page_2)',
  })
  @ApiParam({
    name: 'page',
    description: 'Número da página (1, 2, 3, etc.)',
    example: '2',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de rádios da página informada',
  })
  @ApiResponse({ status: 400, description: 'Número de página inválido' })
  @ApiResponse({ status: 401, description: 'Chave de API ausente ou inválida' })
  findByPage(
    @Param('page', RadioPagePipe) pageNum: number,
    @Query() query: QueryRadiosDto,
  ) {
    return this.radiosService.findAll({ ...query, page: pageNum });
  }

  @Get(':id')
  @Throttle({ default: { limit: 120, ttl: 60000 } })
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
  findOne(@Param('id', RadioIdPipe) numericId: number) {
    const radio = this.radiosService.findOne(numericId);
    if (!radio) {
      throw new NotFoundException(`Radio with id ${numericId} not found`);
    }
    return radio;
  }
}
