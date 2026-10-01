import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { sanitizeInput } from '../utils/sanitize.util';

@Injectable()
export class RadioTagPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!value || typeof value !== 'string') {
      throw new BadRequestException('Parâmetro tag inválido');
    }

    const cleaned = sanitizeInput(value);
    if (!cleaned || cleaned.length < 1 || cleaned.length > 40) {
      throw new BadRequestException('Parâmetro tag inválido');
    }

    // Allowlist: letras, numeros, hifens e underscores
    const tagRegex = /^[\p{L}0-9\-_]{1,40}$/u;
    if (!tagRegex.test(cleaned)) {
      throw new BadRequestException('Parâmetro tag contém caracteres não permitidos');
    }

    return cleaned;
  }
}
