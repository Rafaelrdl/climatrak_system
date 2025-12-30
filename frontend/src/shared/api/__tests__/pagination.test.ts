import { describe, it, expect } from 'vitest';
import { parsePaginatedResponse } from '../pagination';

describe('parsePaginatedResponse', () => {
  it('parses DRF pagination format', () => {
    const raw = {
      count: 2,
      next: 'https://api.example.test/items/?page=2',
      previous: null,
      results: [{ id: 1 }, { id: 2 }],
    };

    const parsed = parsePaginatedResponse<{ id: number }>(raw);

    expect(parsed.items).toEqual([{ id: 1 }, { id: 2 }]);
    expect(parsed.meta.total).toBe(2);
    expect(parsed.meta.next).toBe('https://api.example.test/items/?page=2');
    expect(parsed.meta.prev).toBeNull();
  });

  it('parses finance pagination format', () => {
    const raw = {
      data: [{ id: 'a' }],
      meta: {
        page: 2,
        page_size: 25,
        total: 100,
        total_pages: 4,
      },
    };

    const parsed = parsePaginatedResponse<{ id: string }>(raw);

    expect(parsed.items).toEqual([{ id: 'a' }]);
    expect(parsed.meta.total).toBe(100);
    expect(parsed.meta.page).toBe(2);
    expect(parsed.meta.page_size).toBe(25);
  });
});
