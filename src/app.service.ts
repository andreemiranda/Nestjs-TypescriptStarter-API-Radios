import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getApiInfo(): Record<string, unknown> {
    return {
      name: 'RadiosWave API',
      description: 'Catálogo de estações de rádio brasileiras em streaming',
      version: '1.0.0',
      authentication: {
        type: 'API Key',
        header: 'X-API-Key',
        note: 'Todos os endpoints /api/radios exigem a chave de API no cabeçalho X-API-Key',
      },
      endpoints: {
        list: '/api/radios?q=&state=&tag=&page=1&limit=50&sort=name&order=asc',
        byId: '/api/radios/:id',
        meta: '/api/radios/meta',
        states: '/api/radios/states',
        tags: '/api/radios/tags',
        byState: '/api/radios/by-state/:state',
        byTag: '/api/radios/by-tag/:tag',
      },
      documentation: {
        filters: {
          q: 'busca textual (nome, estado ou tag)',
          state: 'filtra por estado (ex: Tocantins)',
          tag: 'filtra por tag (ex: gospel, popular, noticias)',
        },
        pagination: {
          page: 'número da página (padrão 1)',
          limit: 'itens por página (padrão 50, máx 500)',
        },
        sorting: {
          sort: 'campo de ordenação: name | state | id (padrão name)',
          order: 'direção: asc | desc (padrão asc)',
        },
      },
    };
  }
}
