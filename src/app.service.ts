import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  getApiInfo(): Record<string, unknown> {
    return {
      name: 'RadiosWave API',
      description: 'Catálogo de estações de rádio brasileiras em streaming',
      version: '1.0.0',
      authentication: {
        type: 'API Key',
        header: 'X-API-Key',
        query: 'API_KEY',
        note: 'Todos os endpoints /api/radios exigem a chave de API no cabeçalho X-API-Key ou na query string ?API_KEY=<chave>',
      },
      endpoints: {
        swagger: '/',
        health: '/api/health',
        list: '/api/radios?q=&state=&tag=&page=1&limit=50&sort=name&order=asc',
        byId: '/api/radios/:id',
        meta: '/api/radios/meta',
        states: '/api/radios/states',
        tags: '/api/radios/tags',
        byState: '/api/radios/by-state/:state',
        byTag: '/api/radios/by-tag/:tag',
      },
    };
  }
}
