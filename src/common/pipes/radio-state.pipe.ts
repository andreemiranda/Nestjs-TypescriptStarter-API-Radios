import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { sanitizeInput } from '../utils/sanitize.util';

@Injectable()
export class RadioStatePipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!value || typeof value !== 'string') {
      throw new BadRequestException('Parâmetro state inválido');
    }

    const cleaned = sanitizeInput(value);
    if (!cleaned || cleaned.length < 2 || cleaned.length > 50) {
      throw new BadRequestException('Parâmetro state inválido');
    }

    // Allowlist: letras Unicode com acentos, espacos e hifens
    const stateRegex = /^[\p{L}\s-]{2,50}$/u;
    if (!stateRegex.test(cleaned)) {
      throw new BadRequestException('Parâmetro state contém caracteres não permitidos');
    }

    return cleaned;
  }
}
