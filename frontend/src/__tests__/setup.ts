// Test setup for Vitest
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Setup global test environment
globalThis.localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
} as any;

globalThis.sessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
} as any;

// Mock fetch for tests
global.fetch = vi.fn();

// Mock PDF worker
Object.defineProperty(window, 'Worker', {
  writable: true,
  value: class Worker {
    constructor() {}
    postMessage() {}
    terminate() {}
    addEventListener() {}
    removeEventListener() {}
  },
});

// Mock IndexedDB for tests
Object.defineProperty(window, 'indexedDB', {
  writable: true,
  value: {
    open: vi.fn(),
    deleteDatabase: vi.fn(),
  },
});