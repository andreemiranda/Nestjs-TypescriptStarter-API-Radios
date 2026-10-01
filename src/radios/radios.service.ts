import { Injectable } from '@nestjs/common';
import { DatabaseLoader } from '../database/database.loader';
import { Radio } from './interfaces/radio.interface';
import { QueryRadiosDto } from './dto/query-radios.dto';
import { PaginatedRadios } from './interfaces/paginated-radios.interface';

@Injectable()
export class RadiosService {
  findAll(query: QueryRadiosDto): PaginatedRadios {
    const radios = DatabaseLoader.loadRadios();
    const filtered = this.applyFilters(radios, query);
    const sorted = this.applySort(filtered, query);
    const total = sorted.length;
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit =
      query.per_page && query.per_page > 0
        ? query.per_page
        : query.limit && query.limit > 0
          ? query.limit
          : 50;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const data = sorted.slice(start, start + limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  findOne(id: number | string): Radio | undefined {
    const radios = DatabaseLoader.loadRadios();
    const strId = id.toString();
    const numId = Number(id);

    return radios.find((r) => r.id === numId || r.id.toString() === strId);
  }

  getMeta(): {
    states: string[];
    tags: string[];
    total: number;
  } {
    const radios = DatabaseLoader.loadRadios();
    const states = Array.from(new Set(radios.map((r) => r.state))).sort(
      (a, b) => a.localeCompare(b, 'pt-BR'),
    );
    const tags = Array.from(new Set(radios.flatMap((r) => r.tags))).sort(
      (a, b) => a.localeCompare(b, 'pt-BR'),
    );

    return {
      states,
      tags,
      total: radios.length,
    };
  }

  findByState(
    state: string,
    page = 1,
    limit = 50,
  ): {
    data: Radio[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } {
    const radios = DatabaseLoader.loadRadios();
    const searchState = state.toLowerCase().trim();
    const matched = radios.filter((r) => r.state.toLowerCase() === searchState);
    const total = matched.length;
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(10000, Math.max(1, limit));
    const totalPages = Math.max(1, Math.ceil(total / safeLimit));
    const start = (safePage - 1) * safeLimit;
    const data = matched.slice(start, start + safeLimit);

    return {
      data,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages,
    };
  }

  findByTag(
    tag: string,
    page = 1,
    limit = 50,
  ): {
    data: Radio[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } {
    const radios = DatabaseLoader.loadRadios();
    const searchTag = tag.toLowerCase().trim();
    const matched = radios.filter((r) =>
      r.tags.some((t) => t.toLowerCase() === searchTag),
    );
    const total = matched.length;
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(10000, Math.max(1, limit));
    const totalPages = Math.max(1, Math.ceil(total / safeLimit));
    const start = (safePage - 1) * safeLimit;
    const data = matched.slice(start, start + safeLimit);

    return {
      data,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages,
    };
  }

  private applyFilters(
    radios: readonly Radio[],
    query: QueryRadiosDto,
  ): Radio[] {
    let result = [...radios];

    if (query.q) {
      const q = query.q.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.state.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    if (query.state) {
      const s = query.state.toLowerCase().trim();
      result = result.filter((r) => r.state.toLowerCase() === s);
    }

    if (query.tag) {
      const t = query.tag.toLowerCase().trim();
      result = result.filter((r) =>
        r.tags.some((tag) => tag.toLowerCase() === t),
      );
    }

    return result;
  }

  private applySort(radios: Radio[], query: QueryRadiosDto): Radio[] {
    const sort = query.sort || 'name';
    const order = query.order || 'asc';
    const factor = order === 'desc' ? -1 : 1;

    return [...radios].sort((a, b) => {
      if (sort === 'id') {
        return (Number(a.id) - Number(b.id)) * factor;
      }
      if (sort === 'state') {
        return a.state.localeCompare(b.state, 'pt-BR') * factor;
      }
      return a.name.localeCompare(b.name, 'pt-BR') * factor;
    });
  }
}
