import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { sanitizeString } from '../../common/utils/sanitize.util';

export type RadioSortField = 'name' | 'state' | 'id';
export type SortOrder = 'asc' | 'desc';

export class QueryRadiosDto {
  @ApiPropertyOptional({
    description: 'Busca textual em nome, estado e tags',
    example: 'Palmas',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }) => sanitizeString(value))
  q?: string;

  @ApiPropertyOptional({
    description: 'Filtra por estado da federação',
    example: 'Tocantins',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }: { value: unknown }) => sanitizeString(value))
  state?: string;

  @ApiPropertyOptional({
    description: 'Filtra por tag ou gênero',
    example: 'popular',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }: { value: unknown }) => sanitizeString(value))
  tag?: string;

  @ApiPropertyOptional({
    description: 'Número da página',
    default: 1,
    minimum: 1,
    maximum: 10000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Quantidade de estações por página (máximo 500)',
    default: 50,
    minimum: 1,
    maximum: 500,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit: number = 50;

  @ApiPropertyOptional({
    description: 'Campo de ordenação',
    enum: ['name', 'state', 'id'],
    default: 'name',
  })
  @IsOptional()
  @IsIn(['name', 'state', 'id'])
  sort: RadioSortField = 'name';

  @ApiPropertyOptional({
    description: 'Sentido da ordenação',
    enum: ['asc', 'desc'],
    default: 'asc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: SortOrder = 'asc';

  @ApiPropertyOptional({
    description: 'Chave de autenticação fornecida via query string',
    maxLength: 256,
  })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  API_KEY?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  api_key?: string;
}
