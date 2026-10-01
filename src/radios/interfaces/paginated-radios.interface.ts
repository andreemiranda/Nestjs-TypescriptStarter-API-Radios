import { Radio } from './radio.interface';

export interface PaginatedRadios {
  data: Radio[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
