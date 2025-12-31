// Test setup for Vitest
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Setup localStorage with real implementation for tests that need it
const localStorageStore: Record<string, string> = {};

const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageStore[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageStore[key];
  }),
  clear: vi.fn(() => {
    Object.keys(localStorageStore).forEach(key => delete localStorageStore[key]);
  }),
  get length() {
    return Object.keys(localStorageStore).length;
  },
  key: vi.fn((index: number) => Object.keys(localStorageStore)[index] ?? null),
};

globalThis.localStorage = localStorageMock as any;

const sessionStorageStore: Record<string, string> = {};

globalThis.sessionStorage = {
  getItem: vi.fn((key: string) => sessionStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    sessionStorageStore[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete sessionStorageStore[key];
  }),
  clear: vi.fn(() => {
    Object.keys(sessionStorageStore).forEach(key => delete sessionStorageStore[key]);
  }),
  get length() {
    return Object.keys(sessionStorageStore).length;
  },
  key: vi.fn((index: number) => Object.keys(sessionStorageStore)[index] ?? null),
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

// Mock ResizeObserver for Radix UI components
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverMock,
});

Object.defineProperty(globalThis, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverMock,
});