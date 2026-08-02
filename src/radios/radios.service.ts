import { Injectable } from '@nestjs/common';
import { M3uParser } from './parsers/m3u.parser';
import { Radio, PaginatedRadios, RadioMeta } from './interfaces/radio.interface';
import { QueryRadiosDto } from './dto/query-radios.dto';

const PLAYLIST_FILE = 'Playlist_Profissional_RadiosWave.m3u';

@Injectable()
export class RadiosService {
  private readonly radios: Radio[];

  constructor() {
    const filePath = M3uParser.resolvePlaylistPath(PLAYLIST_FILE);
    this.radios = M3uParser.parse(filePath);
  }

  findAll(query: QueryRadiosDto): PaginatedRadios {
    const filtered = this.applyFilters(query);
    const sorted = this.applySort(filtered, query);
    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / query.limit));
    const start = (query.page - 1) * query.limit;
    const data = sorted.slice(start, start + query.limit);

    return {
      data,
      total,
      page: query.page,
      limit: query.limit,
      totalPages,
    };
  }

  findOne(id: number): Radio | undefined {
    return this.radios.find((radio) => radio.id === id);
  }

  getMeta(): RadioMeta {
    const states = [...new Set(this.radios.map((r) => r.state).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b),
    );
    const tags = [...new Set(this.radios.flatMap((r) => r.tags))].sort((a, b) =>
      a.localeCompare(b),
    );
    return { states, tags, total: this.radios.length };
  }

  findByState(state: string): Radio[] {
    const normalized = state.trim().toLowerCase();
    return this.radios.filter((r) => r.state.toLowerCase() === normalized);
  }

  findByTag(tag: string): Radio[] {
    const normalized = tag.trim().toLowerCase();
    return this.radios.filter((r) =>
      r.tags.some((t) => t.toLowerCase() === normalized),
    );
  }

  private applyFilters(query: QueryRadiosDto): Radio[] {
    return this.radios.filter((radio) => {
      if (query.state) {
        if (radio.state.toLowerCase() !== query.state.toLowerCase()) {
          return false;
        }
      }
      if (query.tag) {
        if (!radio.tags.some((t) => t.toLowerCase() === query.tag!.toLowerCase())) {
          return false;
        }
      }
      if (query.q) {
        const haystack = `${radio.name} ${radio.state} ${radio.tags.join(' ')}`.toLowerCase();
        if (!haystack.includes(query.q.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }

  private applySort(radios: Radio[], query: QueryRadiosDto): Radio[] {
    const sorted = [...radios];
    sorted.sort((a, b) => {
      let cmp = 0;
      if (query.sort === 'id') {
        cmp = a.id - b.id;
      } else {
        cmp = a[query.sort].localeCompare(b[query.sort], 'pt-BR');
      }
      return query.order === 'desc' ? -cmp : cmp;
    });
    return sorted;
  }
}
