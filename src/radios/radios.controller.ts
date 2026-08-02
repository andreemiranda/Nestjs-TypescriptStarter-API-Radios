import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { RadiosService } from './radios.service';
import { QueryRadiosDto } from './dto/query-radios.dto';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@Controller('api/radios')
@UseGuards(ApiKeyGuard)
export class RadiosController {
  constructor(private readonly radiosService: RadiosService) {}

  @Get()
  findAll(@Query() query: Record<string, string>) {
    return this.radiosService.findAll(new QueryRadiosDto(query));
  }

  @Get('meta')
  getMeta() {
    return this.radiosService.getMeta();
  }

  @Get('states')
  getStates() {
    return this.radiosService.getMeta().states;
  }

  @Get('tags')
  getTags() {
    return this.radiosService.getMeta().tags;
  }

  @Get('by-state/:state')
  findByState(@Param('state') state: string) {
    const result = this.radiosService.findByState(state);
    return { data: result, total: result.length };
  }

  @Get('by-tag/:tag')
  findByTag(@Param('tag') tag: string) {
    const result = this.radiosService.findByTag(tag);
    return { data: result, total: result.length };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const numericId = parseInt(id, 10);
    if (Number.isNaN(numericId)) {
      throw new BadRequestException('id must be a number');
    }
    const radio = this.radiosService.findOne(numericId);
    if (!radio) {
      throw new NotFoundException(`Radio with id ${numericId} not found`);
    }
    return radio;
  }
}
