import { buildChatFixtureRoutes } from './chat-fixtures';
import { buildGetEnvRoute, buildResolvedEnvRoute, createEnvState } from './env-helpers';
import { FetchRoute, jsonOk } from './fetch-router';

export type ApiServerStatus =
  | 'disabled'
  | 'configured-needs-restart'
  | 'starting'
  | 'connected'
  | 'error';

export type AgentDetailFixtureOptions = {
  apiServerStatus?: ApiServerStatus;
  launchdStartError?: string;
};

const fileContents: Record<string, string> = {
  'MEMORY.md': '# Memory file\n',
  'USER.md': '# User file\n',
  'SOUL.md': '# Soul file\n',
  'config.yaml': 'name: alpha\n',
};

export function buildAgentDetailRoutes(options: AgentDetailFixtureOptions = {}): FetchRoute[] {
  const apiServerStatus = options.apiServerStatus ?? 'connected';
  const apiServerAvailable = apiServerStatus === 'connected';
  const envState = createEnvState({
    rows: [{ key: 'API_KEY', value: '***', masked: true, visibility: 'secure' }],
  });

  return [
    (url, init) => {
      const method = init?.method ?? 'GET';
      if (url === '/api/launchd' && method === 'POST') {
        const body = JSON.parse(init?.body ?? '{}') as { action?: string };
        if (body.action === 'status') {
          return jsonOk({ running: false });
        }
        if (body.action === 'start' && options.launchdStartError) {
          return { ok: false, json: async () => ({ stderr: options.launchdStartError }) };
        }
        return jsonOk({});
      }
      return undefined;
    },
    (url, init) => {
      const method = init?.method ?? 'GET';
      if (url.includes('/api/agents/alpha') && method === 'GET' && !url.includes('/sessions')) {
        return jsonOk({
          agentId: 'alpha',
          apiServerStatus,
          apiServerAvailable,
          apiServerPort: apiServerAvailable ? 19001 : null,
        });
      }
      return undefined;
    },
    ...buildChatFixtureRoutes({
      name: 'alpha',
      status: apiServerStatus,
      sessions: [],
      messages: [],
      onChatPost: () => ({ ok: false, json: async () => ({ error: 'api_server not available' }) }),
    }),
    (url, init) => {
      const method = init?.method ?? 'GET';
      if (url.startsWith('/api/files?') && method === 'GET') {
        const query = new URLSearchParams(url.split('?')[1] ?? '');
        const path = query.get('path') ?? '';
        return jsonOk({ content: fileContents[path] ?? '' });
      }
      return undefined;
    },
    (url, init) => {
      const method = init?.method ?? 'GET';
      if (url === '/api/files' && method === 'PUT') {
        return jsonOk({});
      }
      return undefined;
    },
    (url, init) => {
      const method = init?.method ?? 'GET';
      if (url === '/api/agents' && method === 'GET') {
        return jsonOk([
          {
            agentId: 'alpha',
            name: 'alpha',
            description: 'test agent',
            tags: ['test'],
            home: '/runtime/agents/alpha',
          },
        ]);
      }
      return undefined;
    },
    (url, init) => {
      const method = init?.method ?? 'GET';
      if (url === '/api/agents/alpha/meta' && method === 'PUT') {
        const body = JSON.parse(init?.body ?? '{}') as {
          name?: string;
          description?: string;
          tags?: string[];
        };
        return jsonOk({
          name: body.name ?? '',
          description: body.description ?? '',
          tags: body.tags ?? [],
        });
      }
      return undefined;
    },
    buildGetEnvRoute('alpha', envState),
    buildResolvedEnvRoute(),
    (url, init) => {
      const method = init?.method ?? 'GET';
      if (url === '/api/skills/tree' && method === 'GET') {
        return jsonOk({
          tree: [
            {
              name: 'coding',
              relativePath: 'coding',
              hasSkill: true,
              children: [],
            },
          ],
        });
      }
      return undefined;
    },
    (url, init) => {
      const method = init?.method ?? 'GET';
      if (url.startsWith('/api/skills/links?') && method === 'GET') {
        return jsonOk([
          {
            id: 1,
            agent: 'alpha',
            sourcePath: '/Users/tumf/.hermes/skills/coding',
            targetPath: '/runtime/agents/alpha/skills/coding',
            exists: true,
            relativePath: 'coding',
          },
        ]);
      }
      return undefined;
    },
  ];
}
