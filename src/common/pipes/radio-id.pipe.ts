import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { isValid14DigitId } from '../utils/id.util';

@Injectable()
export class RadioIdPipe implements PipeTransform<unknown, number> {
  transform(value: unknown): number {
    if (typeof value !== 'string' && typeof value !== 'number') {
      throw new BadRequestException(
        'O parâmetro ID deve possuir 14 dígitos, sem o dígito zero (0) e sem dígitos repetidos consecutivamente',
      );
    }

    const str = String(value).trim();
    if (!isValid14DigitId(str)) {
      throw new BadRequestException(
        'O parâmetro ID deve possuir 14 dígitos, sem o dígito zero (0) e sem dígitos repetidos consecutivamente',
      );
    }

    const num = Number(str);
    if (!Number.isSafeInteger(num)) {
      throw new BadRequestException('ID excede o limite numérico seguro');
    }

    return num;
  }
}
