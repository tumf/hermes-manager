import { MockResponse } from './fetch-router';

export type EnvEntry = {
  key: string;
  value: string;
  masked: boolean;
  visibility: 'plain' | 'secure';
};

const DEFAULT_ALPHA_ENV_ROWS: EnvEntry[] = [
  { key: 'API_KEY', value: '***', masked: true, visibility: 'secure' },
  { key: 'BASE_URL', value: 'https://example.com', masked: false, visibility: 'plain' },
];

export type EnvState = {
  rows: EnvEntry[];
};

function cloneEnvRows(rows: EnvEntry[]): EnvEntry[] {
  return rows.map((row) => ({ ...row }));
}

export function createEnvState(overrides?: Partial<EnvState>): EnvState {
  return {
    rows: cloneEnvRows(overrides?.rows ?? DEFAULT_ALPHA_ENV_ROWS),
  };
}

export function getEnvRows(state: EnvState): EnvEntry[] {
  return state.rows;
}

export function buildGetEnvRoute(
  name: string,
  state: EnvState,
): (url: string, init?: { method?: string }) => MockResponse | undefined {
  return (url, init) => {
    const method = init?.method ?? 'GET';
    if (url === `/api/env?agent=${name}` && method === 'GET') {
      return {
        ok: true,
        json: async () => state.rows,
      };
    }
    return undefined;
  };
}

export function buildPostEnvRoute(): (
  url: string,
  init?: { method?: string; body?: string },
) => MockResponse | undefined {
  return (url, init) => {
    const method = init?.method ?? 'GET';
    if (url === '/api/env' && method === 'POST') {
      return {
        ok: true,
        json: async () => ({ ok: true }),
      };
    }
    return undefined;
  };
}

export function buildDeleteEnvRoute(
  state: EnvState,
): (url: string, init?: { method?: string }) => MockResponse | undefined {
  return (url, init) => {
    const method = init?.method ?? 'GET';
    if (url.startsWith('/api/env?agent=') && url.includes('&key=') && method === 'DELETE') {
      const key = decodeURIComponent(url.split('&key=')[1] ?? '');
      state.rows = state.rows.filter((row) => row.key !== key);
      return { ok: true, json: async () => ({ ok: true }) };
    }
    return undefined;
  };
}

export function buildResolvedEnvRoute(): (
  url: string,
  init?: { method?: string },
) => MockResponse | undefined {
  return (url, init) => {
    const method = init?.method ?? 'GET';
    if (url.startsWith('/api/env/resolved?') && method === 'GET') {
      return {
        ok: true,
        json: async () => [{ key: 'BASE_URL', value: 'https://example.com', source: 'global' }],
      };
    }
    return undefined;
  };
}
