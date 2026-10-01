import { Injectable } from '@nestjs/common';
import { DatabaseLoader } from './database/database.loader';

@Injectable()
export class AppService {
  getHealth(): { status: string } {
    // Retorno minimalista sem expor uptime, ambiente ou versao em rota publica
    return {
      status: 'ok',
    };
  }

  getDetailedHealth(): {
    status: string;
    uptime: number;
    catalogSize: number;
    timestamp: string;
    memoryUsageMb: number;
  } {
    const memory = process.memoryUsage();
    return {
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      catalogSize: DatabaseLoader.loadRadios().length,
      timestamp: new Date().toISOString(),
      memoryUsageMb: Math.round(memory.heapUsed / 1024 / 1024),
    };
  }

  getApiInfo(): Record<string, unknown> {
    return {
      name: 'RadiosWave API',
      description:
        'API REST segura para catalogo e streaming de radios brasileiras.',
      documentation: '/docs',
      authentication: {
        type: 'API Key',
        header: 'X-API-Key',
        bearer: 'Authorization: Bearer <chave>',
      },
    };
  }

  getSecurityTxt(): string {
    return [
      'Contact: mailto:legislativemunicipal@gmail.com',
      'Expires: 2027-12-31T23:59:59.000Z',
      'Preferred-Languages: pt-BR, en',
      'Canonical: https://radioswave.vercel.app/.well-known/security.txt',
      'Policy: https://github.com/legislativemunicipal/radioswave-api/blob/main/SECURITY.md',
      '',
    ].join('\n');
  }

  getRobotsTxt(): string {
    return [
      'User-agent: *',
      'Allow: /',
      'Disallow: /api/health/detailed',
      'Disallow: /api/radios/*',
      'Sitemap: https://radioswave.vercel.app/sitemap.xml',
      '',
    ].join('\n');
  }
}
