import { buildChatFixtureRoutes } from './chat-fixtures';
import { buildGetEnvRoute, buildResolvedEnvRoute, createEnvState } from './env-helpers';
import { FetchRoute, MockResponse, jsonOk } from './fetch-router';

export type ApiServerStatus =
  | 'disabled'
  | 'configured-needs-restart'
  | 'starting'
  | 'connected'
  | 'error';

export type AgentDetailFixtureOptions = {
  apiServerStatus?: ApiServerStatus;
  launchdStartError?: string;
  partialModeEnabled?: boolean;
  hermesVersion?: string | null;
  mcpContent?: string;
  onFilePut?: (body: { agent: string; path: string; content: string }) => MockResponse | undefined;
  onMcpPut?: (body: { content: string }) => MockResponse | undefined;
};

const legacyFileContents: Record<string, string> = {
  'memories/MEMORY.md': '# Memory file\n',
  'memories/USER.md': '# User file\n',
  'SOUL.md': '# Soul file\n',
  'config.yaml': 'name: alpha\n',
};

const defaultMcpContent = ['github:', '  command: npx', '  args:', '    - -y'].join('\n');

const partialFileContents: Record<string, string> = {
  'memories/MEMORY.md': '# Memory file\n',
  'memories/USER.md': '# User file\n',
  'SOUL.md': '# Assembled Soul\n\n## Shared rules\n',
  'SOUL.src.md': '# Soul source\n\n{{partial:directory-structure}}\n',
  'config.yaml': 'name: alpha\n',
};

export function buildAgentDetailRoutes(options: AgentDetailFixtureOptions = {}): FetchRoute[] {
  const apiServerStatus = options.apiServerStatus ?? 'connected';
  const apiServerAvailable = apiServerStatus === 'connected';
  const partialModeEnabled = options.partialModeEnabled ?? false;
  const hermesVersion =
    options.hermesVersion === undefined ? 'hermes 1.2.3' : options.hermesVersion;
  const envState = createEnvState({
    rows: [{ key: 'API_KEY', value: '***', masked: true, visibility: 'secure' }],
  });

  const fileContents: Record<string, string> = {
    ...(partialModeEnabled ? partialFileContents : legacyFileContents),
  };
  let mcpContent = options.mcpContent ?? defaultMcpContent;

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
      if (url === '/api/agents/alpha' && method === 'GET') {
        return jsonOk({
          agentId: 'alpha',
          home: '/runtime/agents/alpha',
          name: 'alpha',
          description: 'test agent',
          tags: ['test'],
          apiServerStatus,
          apiServerAvailable,
          apiServerPort: apiServerAvailable ? 19001 : null,
          partialModeEnabled,
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
        if (path === 'SOUL.src.md' && !partialModeEnabled) {
          return { ok: false, json: async () => ({ error: 'file not found' }) };
        }
        return jsonOk({ content: fileContents[path] ?? '' });
      }
      return undefined;
    },
    (url, init) => {
      const method = init?.method ?? 'GET';
      if (url === '/api/files' && method === 'PUT') {
        const body = JSON.parse(init?.body ?? '{}') as {
          agent: string;
          path: string;
          content: string;
        };
        if (options.onFilePut) {
          const result = options.onFilePut(body);
          if (result !== undefined) return result;
        }
        // Simulate assembler: when SOUL.src.md is saved, update SOUL.md content
        if (body.path === 'SOUL.src.md') {
          fileContents['SOUL.md'] = `# Assembled from source\n\n${body.content}`;
        }
        return jsonOk({ ok: true });
      }
      return undefined;
    },
    (url, init) => {
      const method = init?.method ?? 'GET';
      if (url === '/api/agents/alpha/mcp' && method === 'GET') {
        return jsonOk({
          content: mcpContent,
          docsUrl: 'https://hermes-agent.nousresearch.com/docs/guides/use-mcp-with-hermes',
        });
      }
      if (url === '/api/agents/alpha/mcp' && method === 'PUT') {
        const body = JSON.parse(init?.body ?? '{}') as { content: string };
        if (options.onMcpPut) {
          const result = options.onMcpPut(body);
          if (result !== undefined) return result;
        }
        mcpContent = body.content;
        return jsonOk({ ok: true });
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
            hermesVersion,
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
    (url, init) => {
      const method = init?.method ?? 'GET';
      if (url === '/api/partials' && method === 'GET') {
        return jsonOk([
          {
            name: 'directory-structure',
            content: '## Shared rules',
            usedBy: partialModeEnabled ? ['alpha'] : [],
          },
        ]);
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
            sourcePath: '/mock/skills/coding',
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
