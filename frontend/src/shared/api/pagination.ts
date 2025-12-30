export type Paginated<T> = {
  items: T[];
  meta: {
    total: number;
    page?: number;
    page_size?: number;
    next?: string | null;
    prev?: string | null;
  };
};

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null;

const readNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
};

const readStringOrNull = (value: unknown): string | null | undefined => {
  if (typeof value === 'string') return value;
  if (value === null) return null;
  return undefined;
};

/**
 * Normalize paginated responses into a single canonical shape.
 *
 * Supported formats:
 * - Array: [...]
 * - DRF: { count, next, previous, results }
 * - DRF-lite: { results, count }
 * - Finance: { data, meta: { page, page_size, total, total_pages } }
 * - Wrapped lists: { data: [...] } or { items: [...] }
 */
export function parsePaginatedResponse<T>(raw: unknown): Paginated<T> {
  if (Array.isArray(raw)) {
    return {
      items: raw,
      meta: {
        total: raw.length,
        page: 1,
        page_size: raw.length,
      },
    };
  }

  if (!isRecord(raw)) {
    return { items: [], meta: { total: 0 } };
  }

  const obj = raw as UnknownRecord;
  let items: T[] = [];
  let total: number | undefined;
  let page: number | undefined;
  let pageSize: number | undefined;
  let next: string | null | undefined;
  let prev: string | null | undefined;

  // Finance format: { data, meta }
  if (Array.isArray(obj.data)) {
    items = obj.data as T[];
    if (isRecord(obj.meta)) {
      const meta = obj.meta as UnknownRecord;
      total = readNumber(meta.total);
      page = readNumber(meta.page);
      pageSize = readNumber(meta.page_size ?? meta.pageSize);
      next = readStringOrNull(meta.next);
      prev = readStringOrNull(meta.prev ?? meta.previous);
    }
  }

  // DRF or list wrappers: { results } | { items } | { rows }
  if (items.length === 0) {
    if (Array.isArray(obj.results)) {
      items = obj.results as T[];
    } else if (Array.isArray(obj.items)) {
      items = obj.items as T[];
    } else if (Array.isArray(obj.rows)) {
      items = obj.rows as T[];
    }
  }

  if (total === undefined) {
    total =
      readNumber(obj.count) ??
      readNumber(obj.total) ??
      readNumber(obj.totalCount) ??
      readNumber(obj.total_count);
  }

  if (isRecord(obj.meta)) {
    const meta = obj.meta as UnknownRecord;
    total = total ?? readNumber(meta.total);
    page = page ?? readNumber(meta.page);
    pageSize = pageSize ?? readNumber(meta.page_size ?? meta.pageSize);
    next = next ?? readStringOrNull(meta.next);
    prev = prev ?? readStringOrNull(meta.prev ?? meta.previous);
  }

  page = page ?? readNumber(obj.page);
  pageSize = pageSize ?? readNumber(obj.page_size ?? obj.pageSize ?? obj.limit);
  next = next ?? readStringOrNull(obj.next);
  prev = prev ?? readStringOrNull(obj.previous ?? obj.prev);

  if (total === undefined) {
    total = items.length;
  }

  const meta: Paginated<T>['meta'] = { total };
  if (page !== undefined) meta.page = page;
  if (pageSize !== undefined) meta.page_size = pageSize;
  if (next !== undefined) meta.next = next;
  if (prev !== undefined) meta.prev = prev;

  return { items, meta };
}
