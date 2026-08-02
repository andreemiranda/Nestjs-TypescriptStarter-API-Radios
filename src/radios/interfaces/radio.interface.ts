export interface Radio {
  id: number;
  name: string;
  streamUrl: string;
  logo: string;
  state: string;
  tags: string[];
}

export interface PaginatedRadios {
  data: Radio[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RadioMeta {
  states: string[];
  tags: string[];
  total: number;
}
