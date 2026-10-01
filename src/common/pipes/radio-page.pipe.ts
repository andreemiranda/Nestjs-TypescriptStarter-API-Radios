import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class RadioPagePipe implements PipeTransform<unknown, number> {
  transform(value: unknown): number {
    if (typeof value !== 'string' && typeof value !== 'number') {
      throw new BadRequestException(
        'O parâmetro page deve ser um número inteiro positivo (mínimo 1)',
      );
    }

    const str = String(value).trim();
    if (!/^\d+$/.test(str)) {
      throw new BadRequestException(
        'O parâmetro page deve ser um número inteiro positivo (mínimo 1)',
      );
    }

    const pageNum = parseInt(str, 10);
    if (!Number.isFinite(pageNum) || pageNum < 1 || pageNum > 10000) {
      throw new BadRequestException(
        'O parâmetro page deve ser um número inteiro positivo entre 1 e 10000',
      );
    }

    return pageNum;
  }
}
