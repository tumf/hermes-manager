import { vi } from 'vitest';

export type FetchInit = {
  method?: string;
  body?: string;
};

export type MockResponse = {
  ok: boolean;
  json?: () => Promise<unknown>;
  body?: ReadableStream<Uint8Array>;
};

export type FetchRoute = (url: string, init?: FetchInit) => MockResponse | undefined;

export function jsonOk(payload: unknown): MockResponse {
  return { ok: true, json: async () => payload };
}

export function createFetchRouter(routes: FetchRoute[], fallback?: MockResponse) {
  return vi.fn().mockImplementation(async (url: string, init?: FetchInit) => {
    for (const route of routes) {
      const res = route(url, init);
      if (res !== undefined) {
        return res;
      }
    }
    return fallback ?? jsonOk({});
  });
}
