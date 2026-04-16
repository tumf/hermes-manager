// @vitest-environment node
import { execFile } from 'node:child_process';

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from '../../app/api/launchd/statuses/route';
import type { Agent } from '@/src/lib/agents';

const mockState = vi.hoisted(() => ({
  agents: [] as Agent[],
  parseRunning: vi.fn(() => true),
  parsePid: vi.fn((): number | null => 12345),
}));

vi.mock('@/src/lib/agents', () => ({
  getAgent: vi.fn(async (id: string) => mockState.agents.find((a) => a.agentId === id) ?? null),
  readAgentMeta: vi.fn(async () => null),
  allocateApiServerPort: vi.fn(async () => 8642),
  updateAgentMeta: vi.fn(async () => null),
}));

const mockAdapter = {
  type: 'launchd' as const,
  getServiceDefinitionPath: vi.fn(
    (agentId: string) => `/Users/test/Library/LaunchAgents/ai.hermes.gateway.${agentId}.plist`,
  ),
  generateServiceDefinition: vi.fn(() => '<plist>mock</plist>'),
  buildInstallCommands: vi.fn(() => ({ pre: [], bootstrap: [], post: [] })),
  buildUninstallCommands: vi.fn(() => ({ pre: [], remove: [], post: [] })),
  buildStartCommand: vi.fn(() => ['launchctl', 'kickstart']),
  buildStopCommand: vi.fn(() => ['launchctl', 'kill']),
  buildRestartCommand: vi.fn(() => ['launchctl', 'kickstart', '-k']),
  buildStatusCommand: vi.fn((label: string) => ['launchctl', 'print', `gui/501/${label}`]),
  parseRunning: mockState.parseRunning,
  parsePid: mockState.parsePid,
  isServiceMissing: vi.fn(() => false),
};

vi.mock('@/src/lib/service-manager', () => ({
  getServiceAdapter: vi.fn(() => mockAdapter),
}));

vi.mock('node:child_process', () => ({
  execFile: vi.fn(
    (
      _cmd: string,
      _args: string[],
      cb: (err: Error | null, result?: { stdout: string; stderr: string }) => void,
    ) => {
      cb(null, { stdout: 'ok', stderr: '' });
    },
  ),
}));

vi.mock('node:fs', () => ({
  default: { mkdirSync: vi.fn(), writeFileSync: vi.fn(), unlinkSync: vi.fn() },
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    agentId: 'alpha11',
    home: '/runtime/agents/alpha11',
    label: 'ai.hermes.gateway.alpha11',
    enabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    name: 'Alpha',
    description: '',
    tags: [],
    apiServerStatus: 'disabled',
    apiServerAvailable: false,
    apiServerPort: 8645,
    memoryRssBytes: null,
    hermesVersion: null,
    ...overrides,
  };
}

function makeReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/launchd/statuses', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/launchd/statuses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.agents = [];
    mockState.parseRunning.mockReturnValue(true);
    mockState.parsePid.mockReturnValue(12345);
    vi.mocked(execFile).mockImplementation(((...fnArgs: unknown[]) => {
      const cb = fnArgs[fnArgs.length - 1] as (
        err: Error | null,
        result?: { stdout: string; stderr: string },
      ) => void;
      cb(null, { stdout: 'ok', stderr: '' });
    }) as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = new NextRequest('http://localhost/api/launchd/statuses', {
      method: 'POST',
      body: 'not-json{{',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error', 'Invalid JSON');
  });

  it('returns 400 for missing agents field', async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
  });

  it('returns 400 for empty agents array', async () => {
    const res = await POST(makeReq({ agents: [] }));
    expect(res.status).toBe(400);
  });

  it('returns statuses for multiple agents', async () => {
    mockState.agents = [
      makeAgent({ agentId: 'alpha11', label: 'ai.hermes.gateway.alpha11' }),
      makeAgent({ agentId: 'beta222', label: 'ai.hermes.gateway.beta222' }),
    ];
    mockState.parseRunning.mockReturnValue(true);
    mockState.parsePid.mockReturnValue(42);

    const res = await POST(makeReq({ agents: ['alpha11', 'beta222'] }));
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      statuses: Array<{
        agent: string;
        running: boolean | null;
        pid: number | null;
        code: number | null;
        manager: string | null;
        error?: string;
      }>;
    };
    expect(body.statuses).toHaveLength(2);
    for (const entry of body.statuses) {
      expect(entry).toHaveProperty('agent');
      expect(entry).toHaveProperty('running', true);
      expect(entry).toHaveProperty('pid', 42);
      expect(entry).toHaveProperty('code');
      expect(entry).toHaveProperty('manager', 'launchd');
      expect(entry.error).toBeUndefined();
    }
    expect(body.statuses.map((s) => s.agent).sort()).toEqual(['alpha11', 'beta222']);
  });

  it('returns 200 with per-agent not-found error when an agent is missing', async () => {
    mockState.agents = [makeAgent({ agentId: 'alpha11' })];
    mockState.parseRunning.mockReturnValue(true);
    mockState.parsePid.mockReturnValue(42);

    const res = await POST(makeReq({ agents: ['alpha11', 'ghost999'] }));
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      statuses: Array<{ agent: string; running: boolean | null; error?: string }>;
    };
    expect(body.statuses).toHaveLength(2);

    const alpha = body.statuses.find((s) => s.agent === 'alpha11');
    const ghost = body.statuses.find((s) => s.agent === 'ghost999');

    expect(alpha).toMatchObject({ running: true });
    expect(alpha?.error).toBeUndefined();

    expect(ghost).toBeDefined();
    expect(ghost?.running).toBeNull();
    expect(ghost?.error).toContain('ghost999');
    expect(ghost?.error).toMatch(/not found/i);
  });

  it('deduplicates repeated agent names in the batch', async () => {
    mockState.agents = [makeAgent({ agentId: 'alpha11' })];
    const res = await POST(makeReq({ agents: ['alpha11', 'alpha11'] }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { statuses: unknown[] };
    expect(body.statuses).toHaveLength(1);
  });
});
