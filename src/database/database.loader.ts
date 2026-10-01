import * as fs from 'fs';
import * as path from 'path';
import { InternalServerErrorException } from '@nestjs/common';
import { Radio } from '../radios/interfaces/radio.interface';
import { isValid14DigitId } from '../common/utils/id.util';
import { appLogger } from '../common/services/logger.service';

export function isSafeUrl(urlStr: string, allowHttp: boolean): boolean {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }
    if (parsed.protocol === 'http:' && !allowHttp) {
      return false;
    }
    // Rejeita credenciais embutidas na URL (ex: https://user:pass@host)
    if (parsed.username || parsed.password) {
      return false;
    }
    // Previne SSRF: bloqueia hosts de loopback, redes privadas e link-local
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host.endsWith('.local') ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) ||
      /^169\.254\./.test(host) ||
      host === '::1'
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export class DatabaseLoader {
  private static cachedRadios: readonly Radio[] | null = null;
  private static lastMtime = 0;
  private static resolvedPath: string | null = null;

  static resolveDatabasePath(): string {
    const allowedBase = path.resolve(process.cwd());

    if (process.env.RADIOS_DB_PATH) {
      const targetPath = path.resolve(allowedBase, process.env.RADIOS_DB_PATH);

      // Verificacao rigorosa contra Path Traversal
      if (!targetPath.startsWith(allowedBase + path.sep) && targetPath !== allowedBase) {
        throw new InternalServerErrorException(
          'RADIOS_DB_PATH invalido: tentativa de path traversal detectada.',
        );
      }

      if (fs.existsSync(targetPath)) {
        // Verificacao contra links simbolicos que apontem para fora da base permitida
        const real = fs.realpathSync(targetPath);
        if (!real.startsWith(allowedBase + path.sep) && real !== allowedBase) {
          throw new InternalServerErrorException(
            'RADIOS_DB_PATH invalido: link simbolico aponta para fora do diretorio permitido.',
          );
        }
        return targetPath;
      }

      throw new InternalServerErrorException(
        `Arquivo RADIOS_DB_PATH nao encontrado: ${process.env.RADIOS_DB_PATH}`,
      );
    }

    const candidates = [
      path.join(allowedBase, 'src', 'database', 'radios.json'),
      path.join(allowedBase, 'dist', 'database', 'radios.json'),
      path.join(allowedBase, 'dist', 'src', 'database', 'radios.json'),
      path.join(allowedBase, 'database', 'radios.json'),
      path.join(__dirname, 'radios.json'),
      path.join(__dirname, '..', 'database', 'radios.json'),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    throw new InternalServerErrorException(
      'Radios database file (radios.json) not found in allowed locations.',
    );
  }

  static validateCatalog(data: unknown): Radio[] {
    if (!Array.isArray(data)) {
      throw new InternalServerErrorException('Catalogo de radios deve ser um array JSON.');
    }

    const allowHttp =
      process.env.ALLOW_INSECURE_HTTP_STREAMS === 'true' ||
      process.env.NODE_ENV !== 'production';

    const validated: Radio[] = [];
    let insecureCount = 0;

    for (let i = 0; i < data.length; i++) {
      const item = data[i] as Record<string, unknown>;

      if (!item || typeof item !== 'object') {
        throw new InternalServerErrorException(`Registro #${i + 1} invalido no catalogo.`);
      }

      const id = item.id;
      if (!isValid14DigitId(id)) {
        const stationName = typeof item.name === 'string' ? item.name : 'desconhecido';
        const strId = typeof id === 'number' || typeof id === 'string' ? String(id) : 'invalido';
        throw new InternalServerErrorException(
          `Registro #${i + 1} (${stationName}) possui ID invalido: ${strId}. Deve ter 14 digitos sem 0 e sem repeticoes consecutivas.`,
        );
      }

      if (typeof item.name !== 'string' || item.name.trim().length === 0 || item.name.length > 100) {
        throw new InternalServerErrorException(`Registro #${i + 1} possui nome invalido.`);
      }

      if (typeof item.streamUrl !== 'string' || item.streamUrl.length > 500) {
        throw new InternalServerErrorException(`Registro #${i + 1} possui streamUrl invalida.`);
      }

      if (typeof item.logo !== 'string' || item.logo.length > 500) {
        throw new InternalServerErrorException(`Registro #${i + 1} possui logo invalida.`);
      }

      if (typeof item.state !== 'string' || item.state.length > 50) {
        throw new InternalServerErrorException(`Registro #${i + 1} possui state invalido.`);
      }

      if (!Array.isArray(item.tags)) {
        throw new InternalServerErrorException(`Registro #${i + 1} possui tags invalidas.`);
      }

      // Validacao de seguranca da URL do stream
      if (item.streamUrl.startsWith('http://')) {
        insecureCount++;
        if (!allowHttp) {
          throw new InternalServerErrorException(
            `Registro #${i + 1} (${item.name}) utiliza stream HTTP inseguro bloqueado em producao: ${item.streamUrl}`,
          );
        }
      }

      if (!isSafeUrl(item.streamUrl, allowHttp)) {
        throw new InternalServerErrorException(
          `Registro #${i + 1} (${item.name}) possui streamUrl perigosa ou apontando para rede interna (SSRF): ${item.streamUrl}`,
        );
      }

      if (!isSafeUrl(item.logo, allowHttp)) {
        throw new InternalServerErrorException(
          `Registro #${i + 1} (${item.name}) possui logo apontando para rede interna ou esquema inseguro: ${item.logo}`,
        );
      }

      validated.push({
        id: Number(id),
        name: item.name.trim(),
        streamUrl: item.streamUrl.trim(),
        logo: item.logo.trim(),
        state: item.state.trim(),
        tags: item.tags.map((t) => String(t).trim()),
      });
    }

    if (insecureCount > 0) {
      appLogger.warn(
        `Alerta de seguranca: ${insecureCount} estacao(oes) utilizam stream HTTP sem criptografia TLS.`,
        'DatabaseLoader',
      );
    }

    // Retorna array imutavel congelado para impedir mutacoes acidentais
    return Object.freeze(validated) as unknown as Radio[];
  }

  static loadRadios(): readonly Radio[] {
    const isProd = process.env.NODE_ENV === 'production';

    // Em producao, se ja estiver em cache, nunca toca o disco
    if (this.cachedRadios && isProd) {
      return this.cachedRadios;
    }

    const filePath = this.resolvedPath || this.resolveDatabasePath();
    this.resolvedPath = filePath;

    let stat: fs.Stats;
    try {
      stat = fs.statSync(filePath);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha nos metadados';
      throw new InternalServerErrorException(`Falha ao obter metadados do banco: ${msg}`);
    }

    // Em desenvolvimento ou testes, reaproveita o cache se mtime nao mudou
    if (this.cachedRadios && stat.mtimeMs === this.lastMtime) {
      return this.cachedRadios;
    }

    // Recarrega do disco
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na leitura';
      throw new InternalServerErrorException(`Falha ao ler arquivo radios.json: ${msg}`);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha no parse do JSON';
      throw new InternalServerErrorException(`JSON invalido no arquivo radios.json: ${msg}`);
    }

    const validated = this.validateCatalog(parsed);
    this.cachedRadios = validated;
    this.lastMtime = stat.mtimeMs;
    return this.cachedRadios;
  }

  static resetCache(): void {
    this.cachedRadios = null;
    this.lastMtime = 0;
    this.resolvedPath = null;
  }
}
