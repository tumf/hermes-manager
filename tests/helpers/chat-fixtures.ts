import { FetchRoute, MockResponse, jsonOk } from './fetch-router';

export type AgentStatus =
  | 'disabled'
  | 'configured-needs-restart'
  | 'starting'
  | 'connected'
  | 'error';

export type SessionRow = {
  id: string;
  source: string;
  title: string;
  started_at: string;
  message_count: number;
};

export type MessageRow = {
  session_id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: string;
  tool_name: string | null;
};

export type ChatFixtureOptions = {
  name?: string;
  status?: AgentStatus;
  sessions?: SessionRow[];
  messages?: MessageRow[];
  onChatPost?: (body: { message?: string }) => MockResponse;
};

const DEFAULT_NAME = 'alpha';
const DEFAULT_SESSIONS: SessionRow[] = [
  {
    id: 's1',
    source: 'tool',
    title: 'Session A',
    started_at: '2026-01-01T00:00:00Z',
    message_count: 2,
  },
];

function defaultChatResponse(): MockResponse {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        new TextEncoder().encode('data: {"choices":[{"delta":{"content":"hello"}}]}\\n\\n'),
      );
      controller.enqueue(new TextEncoder().encode('data: [DONE]\\n\\n'));
      controller.close();
    },
  });

  return {
    ok: true,
    body: stream,
  };
}

export function buildChatFixtureRoutes(options: ChatFixtureOptions = {}): FetchRoute[] {
  const name = options.name ?? DEFAULT_NAME;
  const status = options.status ?? 'connected';
  const sessions = options.sessions ?? DEFAULT_SESSIONS;
  const messages = options.messages ?? [];

  return [
    (url, init) => {
      const method = init?.method ?? 'GET';
      if (url.includes(`/api/agents/${name}`) && !url.includes('/sessions') && method === 'GET') {
        return jsonOk({
          agentId: name,
          apiServerStatus: status,
          apiServerAvailable: status === 'connected',
          apiServerPort: status === 'connected' ? 19001 : null,
        });
      }
      return undefined;
    },
    (url, init) => {
      const method = init?.method ?? 'GET';
      if (url.includes('/sessions') && !url.includes('/messages') && method === 'GET') {
        return jsonOk(sessions);
      }
      return undefined;
    },
    (url, init) => {
      const method = init?.method ?? 'GET';
      if (url.includes('/messages') && method === 'GET') {
        return jsonOk(messages);
      }
      return undefined;
    },
    (url, init) => {
      const method = init?.method ?? 'GET';
      if (url.includes('/chat') && method === 'POST') {
        const body = JSON.parse(init?.body ?? '{}') as { message?: string };
        return options.onChatPost ? options.onChatPost(body) : defaultChatResponse();
      }
      return undefined;
    },
  ];
}
