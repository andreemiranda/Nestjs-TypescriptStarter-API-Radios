import { Injectable } from '@nestjs/common';
import { DatabaseLoader } from '../database/database.loader';
import {
  Radio,
  PaginatedRadios,
  RadioMeta,
} from './interfaces/radio.interface';
import { QueryRadiosDto } from './dto/query-radios.dto';

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
    return radios.find(
      (radio) => radio.id === numId || radio.id.toString() === strId,
    );
  }

  getMeta(): RadioMeta {
    const radios = DatabaseLoader.loadRadios();
    const states = [
      ...new Set(radios.map((r) => r.state).filter(Boolean)),
    ].sort((a, b) => (a ?? '').localeCompare(b ?? ''));

    const tags = [
      ...new Set(
        radios
          .flatMap((r) => (Array.isArray(r.tags) ? r.tags : []))
          .filter(Boolean),
      ),
    ].sort((a, b) => (a ?? '').localeCompare(b ?? ''));

    return { states, tags, total: radios.length };
  }

  findByState(state: string): Radio[] {
    const radios = DatabaseLoader.loadRadios();
    const normalized = state.trim().toLowerCase();
    return radios.filter(
      (r) => (r.state ?? '').trim().toLowerCase() === normalized,
    );
  }

  findByTag(tag: string): Radio[] {
    const radios = DatabaseLoader.loadRadios();
    const normalized = tag.trim().toLowerCase();
    return radios.filter(
      (r) =>
        Array.isArray(r.tags) &&
        r.tags.some((t) => t && t.trim().toLowerCase() === normalized),
    );
  }

  private applyFilters(radios: Radio[], query: QueryRadiosDto): Radio[] {
    return radios.filter((radio) => {
      if (query.state) {
        const radioState = radio.state ?? '';
        if (radioState.toLowerCase() !== query.state.toLowerCase()) {
          return false;
        }
      }
      if (query.tag) {
        const radioTags = Array.isArray(radio.tags) ? radio.tags : [];
        if (
          !radioTags.some(
            (t) => t && t.toLowerCase() === query.tag.toLowerCase(),
          )
        ) {
          return false;
        }
      }
      if (query.q) {
        const radioName = radio.name ?? '';
        const radioState = radio.state ?? '';
        const radioTags = Array.isArray(radio.tags) ? radio.tags.join(' ') : '';
        const radioId = radio.id ? radio.id.toString() : '';
        const haystack =
          `${radioName} ${radioState} ${radioTags} ${radioId}`.toLowerCase();
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
        const aId = typeof a.id === 'number' ? a.id : Number(a.id) || 0;
        const bId = typeof b.id === 'number' ? b.id : Number(b.id) || 0;
        cmp = aId - bId;
      } else {
        const aVal = (a[query.sort] ?? '').toString();
        const bVal = (b[query.sort] ?? '').toString();
        cmp = aVal.localeCompare(bVal, 'pt-BR');
      }
      return query.order === 'desc' ? -cmp : cmp;
    });
    return sorted;
  }
}
