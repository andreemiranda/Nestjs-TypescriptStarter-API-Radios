export type RadioSortField = 'name' | 'state' | 'id';
export type SortOrder = 'asc' | 'desc';

export class QueryRadiosDto {
  q?: string;
  state?: string;
  tag?: string;
  page: number;
  limit: number;
  sort: RadioSortField;
  order: SortOrder;

  constructor(props: Record<string, string> = {}) {
    this.q = this.trimOrUndefined(props['q']);
    this.state = this.trimOrUndefined(props['state']);
    this.tag = this.trimOrUndefined(props['tag']);
    this.page = Math.max(1, parseInt(props['page'], 10) || 1);
    this.limit = Math.min(500, Math.max(1, parseInt(props['limit'], 10) || 50));
    this.sort =
      props['sort'] === 'state' || props['sort'] === 'id' ? props['sort'] : 'name';
    this.order = props['order'] === 'desc' ? 'desc' : 'asc';
  }

  private trimOrUndefined(value?: string): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  }
}
