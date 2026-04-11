// @vitest-environment node
import { execFile } from 'node:child_process';

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Agent } from '@/src/lib/agents';

// --- hoisted mock state ---
const mockState = vi.hoisted(() => ({
  agents: [] as Agent[],
  execFileCode: 0 as number,
  execFileStdout: '' as string,
  execFileStderr: '' as string,
}));

// --- mock @/src/lib/agents ---
vi.mock('@/src/lib/agents', () => ({
  getAgent: vi.fn(async (id: string) => mockState.agents.find((a) => a.agentId === id) ?? null),
  readAgentMeta: vi.fn(async (id: string) => {
    const agent = mockState.agents.find((a) => a.agentId === id);
    if (!agent) return null;
    return {
      name: agent.name,
      description: agent.description,
      tags: agent.tags,
      apiServerPort: agent.apiServerPort,
    };
  }),
  allocateApiServerPort: vi.fn(async () => 8642),
  updateAgentMeta: vi.fn(async (id: string, meta: Record<string, unknown>) => {
    const agent = mockState.agents.find((a) => a.agentId === id);
    if (!agent) return null;
    return { ...meta, apiServerPort: meta.apiServerPort ?? agent.apiServerPort };
  }),
}));

// --- mock @/src/lib/service-manager ---
const mockAdapter = {
  type: 'launchd' as const,
  getServiceDefinitionPath: vi.fn(
    (agentId: string) => `/Users/test/Library/LaunchAgents/ai.hermes.gateway.${agentId}.plist`,
  ),
  generateServiceDefinition: vi.fn(() => '<plist>mock</plist>'),
  buildInstallCommands: vi.fn((_agentId: string, label: string) => ({
    pre: [['launchctl', 'print', `gui/501/${label}`]],
    bootstrap: ['launchctl', 'bootstrap', `gui/501`, '/path/to/plist'],
    post: [],
  })),
  buildUninstallCommands: vi.fn((_agentId: string, label: string) => ({
    pre: [['launchctl', 'bootout', `gui/501/${label}`]],
    remove: ['launchctl', 'bootout', `gui/501/${label}`],
    post: [],
  })),
  buildStartCommand: vi.fn((label: string) => ['launchctl', 'kickstart', `gui/501/${label}`]),
  buildStopCommand: vi.fn((label: string) => ['launchctl', 'kill', 'SIGTERM', `gui/501/${label}`]),
  buildRestartCommand: vi.fn((label: string, _uid: number) => [
    'launchctl',
    'kickstart',
    '-k',
    `gui/501/${label}`,
  ]),
  buildStatusCommand: vi.fn((label: string, _uid: number) => [
    'launchctl',
    'print',
    `gui/501/${label}`,
  ]),
  parseRunning: vi.fn(() => true),
  parsePid: vi.fn((): number | null => 12345),
  isServiceMissing: vi.fn(() => false),
};

vi.mock('@/src/lib/service-manager', () => ({
  getServiceAdapter: vi.fn(() => mockAdapter),
}));

// --- mock node:child_process ---
vi.mock('node:child_process', () => ({
  execFile: vi.fn(
    (
      _cmd: string,
      _args: string[],
      cb: (err: Error | null, result?: { stdout: string; stderr: string }) => void,
    ) => {
      if (mockState.execFileCode !== 0) {
        const err = new Error('command failed') as Error & {
          stdout: string;
          stderr: string;
          code: number;
        };
        err.stdout = mockState.execFileStdout;
        err.stderr = mockState.execFileStderr;
        err.code = mockState.execFileCode;
        cb(err);
      } else {
        cb(null, { stdout: mockState.execFileStdout, stderr: mockState.execFileStderr });
      }
    },
  ),
}));

// --- mock node:fs ---
vi.mock('node:fs', () => ({
  default: {
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    unlinkSync: vi.fn(),
  },
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

// Import handler after mocks
import { POST } from '../../app/api/launchd/route';

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    agentId: 'test-agent',
    home: '/runtime/agents/test-agent',
    label: 'ai.hermes.gateway.test-agent',
    enabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    name: 'Test Agent',
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
  return new NextRequest('http://localhost/api/launchd', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeInvalidJsonReq(): NextRequest {
  return new NextRequest('http://localhost/api/launchd', {
    method: 'POST',
    body: 'not-json{{{',
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/launchd', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.agents = [];
    mockState.execFileCode = 0;
    mockState.execFileStdout = '';
    mockState.execFileStderr = '';
    // Restore default execFile mock implementation (test 6 overrides it)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(execFile).mockImplementation(
      ((...fnArgs: unknown[]) => {
        const cb = fnArgs[fnArgs.length - 1] as (
          err: Error | null,
          result?: { stdout: string; stderr: string },
        ) => void;
        if (mockState.execFileCode !== 0) {
          const err = new Error('command failed') as Error & {
            stdout: string;
            stderr: string;
            code: number;
          };
          err.stdout = mockState.execFileStdout;
          err.stderr = mockState.execFileStderr;
          err.code = mockState.execFileCode;
          cb(err);
        } else {
          cb(null, { stdout: mockState.execFileStdout, stderr: mockState.execFileStderr });
        }
      }) as any,
    );
    // Reset adapter mocks to defaults
    mockAdapter.parseRunning.mockReturnValue(true);
    mockAdapter.parsePid.mockReturnValue(12345);
    mockAdapter.isServiceMissing.mockReturnValue(false);
    mockAdapter.buildInstallCommands.mockImplementation((_agentId: string, label: string) => ({
      pre: [['launchctl', 'print', `gui/501/${label}`]],
      bootstrap: ['launchctl', 'bootstrap', `gui/501`, '/path/to/plist'],
      post: [],
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --- 1. Invalid JSON ---
  it('returns 400 for invalid JSON body', async () => {
    const res = await POST(makeInvalidJsonReq());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error', 'Invalid JSON');
  });

  // --- 2. Missing/invalid fields ---
  it('returns 400 for missing agent field', async () => {
    const res = await POST(makeReq({ action: 'start' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('returns 400 for invalid action', async () => {
    const res = await POST(makeReq({ agent: 'test-agent', action: 'destroy' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  // --- 3. Unknown agent ---
  it('returns 404 for unknown agent', async () => {
    mockState.agents = [];
    const res = await POST(makeReq({ agent: 'ghost', action: 'status' }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('ghost');
  });

  // --- 4. install success ---
  it('install: returns { stdout, stderr, code, manager } on success', async () => {
    mockState.agents = [makeAgent()];
    // Make pre-check fail (code != 0) so it skips bootout and goes straight to bootstrap
    mockState.execFileCode = 0;
    mockState.execFileStdout = 'ok';
    mockState.execFileStderr = '';

    const res = await POST(makeReq({ agent: 'test-agent', action: 'install' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('stdout');
    expect(body).toHaveProperty('stderr');
    expect(body).toHaveProperty('code');
    expect(body).toHaveProperty('manager', 'launchd');
    expect(typeof body.stdout).toBe('string');
    expect(typeof body.stderr).toBe('string');
    expect(typeof body.code).toBe('number');
  });

  // --- 5. start success ---
  it('start: returns { stdout, stderr, code, running, pid, timedOut, manager } on success', async () => {
    mockState.agents = [makeAgent()];
    mockState.execFileStdout = 'ok';
    mockAdapter.parseRunning.mockReturnValue(true);
    mockAdapter.parsePid.mockReturnValue(12345);

    const res = await POST(makeReq({ agent: 'test-agent', action: 'start' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('stdout');
    expect(body).toHaveProperty('stderr');
    expect(body).toHaveProperty('code', 0);
    expect(body).toHaveProperty('running', true);
    expect(body).toHaveProperty('pid', 12345);
    expect(body).toHaveProperty('timedOut', false);
    expect(body).toHaveProperty('manager', 'launchd');
  });

  // --- 6. start command fails ---
  it('start: returns 500 with { running: false, manager } when start command fails', async () => {
    mockState.agents = [makeAgent()];
    // Bootstrap succeeds, then start fails
    let callCount = 0;
    const { execFile } = await import('node:child_process');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(execFile).mockImplementation(
      ((...fnArgs: unknown[]) => {
        callCount++;
        const cmd = fnArgs[0] as string;
        const args = fnArgs[1] as string[];
        const cb = fnArgs[fnArgs.length - 1] as (
          err: Error | null,
          result?: { stdout: string; stderr: string },
        ) => void;
        if (cmd === 'launchctl' && args[0] === 'kickstart' && !args.includes('-k')) {
          const err = new Error('start failed') as Error & {
            stdout: string;
            stderr: string;
            code: number;
          };
          err.stdout = '';
          err.stderr = 'start error';
          err.code = 1;
          cb(err);
        } else {
          cb(null, { stdout: 'ok', stderr: '' });
        }
      }) as any,
    );

    const res = await POST(makeReq({ agent: 'test-agent', action: 'start' }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toHaveProperty('running', false);
    expect(body).toHaveProperty('manager', 'launchd');
    expect(body).toHaveProperty('stdout');
    expect(body).toHaveProperty('stderr');
    expect(body).toHaveProperty('code');
  });

  // --- 7. stop success ---
  it('stop: returns { stdout, stderr, code, running, pid, timedOut, manager } on success', async () => {
    mockState.agents = [makeAgent()];
    mockState.execFileStdout = 'ok';
    mockAdapter.parseRunning.mockReturnValue(false);
    mockAdapter.parsePid.mockReturnValue(null);

    const res = await POST(makeReq({ agent: 'test-agent', action: 'stop' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('stdout');
    expect(body).toHaveProperty('stderr');
    expect(body).toHaveProperty('code', 0);
    expect(body).toHaveProperty('running', false);
    expect(body).toHaveProperty('pid', null);
    expect(body).toHaveProperty('timedOut', false);
    expect(body).toHaveProperty('manager', 'launchd');
  });

  // --- 8. restart success ---
  it('restart: returns { stdout, stderr, code, running, pid, timedOut, manager } on success', async () => {
    mockState.agents = [makeAgent()];
    mockState.execFileStdout = 'ok';
    mockAdapter.parseRunning.mockReturnValue(true);
    mockAdapter.parsePid.mockReturnValue(12345);

    const res = await POST(makeReq({ agent: 'test-agent', action: 'restart' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('stdout');
    expect(body).toHaveProperty('stderr');
    expect(body).toHaveProperty('code', 0);
    expect(body).toHaveProperty('running', true);
    expect(body).toHaveProperty('pid', 12345);
    expect(body).toHaveProperty('timedOut', false);
    expect(body).toHaveProperty('manager', 'launchd');
  });

  // --- 9. restart: service not running after restart ---
  it('restart: returns 500 when service not running after restart', async () => {
    vi.useFakeTimers();
    mockState.agents = [makeAgent()];
    mockState.execFileStdout = 'ok';
    // parseRunning returns false -> waitForState will time out
    mockAdapter.parseRunning.mockReturnValue(false);
    mockAdapter.parsePid.mockReturnValue(null);

    const promise = POST(makeReq({ agent: 'test-agent', action: 'restart' }));

    // Advance past the bootstrap sleep(1000) + polling intervals + timeout
    // The route uses POLL_TIMEOUT=10000, POLL_INTERVAL=500
    // Also ensureServiceBootstrapped has a 1000ms sleep after bootout
    for (let i = 0; i < 30; i++) {
      await vi.advanceTimersByTimeAsync(1000);
    }

    const res = await promise;
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toHaveProperty('running', false);
    expect(body).toHaveProperty('pid', null);
    expect(body).toHaveProperty('timedOut', true);
    expect(body).toHaveProperty('manager', 'launchd');
  });

  // --- 10. status ---
  it('status: returns { running, pid, output, stdout, stderr, code, manager }', async () => {
    mockState.agents = [makeAgent()];
    mockState.execFileStdout = 'status output';
    mockState.execFileStderr = 'status err';
    mockAdapter.parseRunning.mockReturnValue(true);
    mockAdapter.parsePid.mockReturnValue(42);

    const res = await POST(makeReq({ agent: 'test-agent', action: 'status' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('running', true);
    expect(body).toHaveProperty('pid', 42);
    expect(body).toHaveProperty('output');
    expect(body).toHaveProperty('stdout');
    expect(body).toHaveProperty('stderr');
    expect(body.output).toBe(body.stdout);
    expect(body).toHaveProperty('code', 0);
    expect(body).toHaveProperty('manager', 'launchd');
  });

  // --- 11. port resolution fails ---
  it('install returns 500 when port resolution fails', async () => {
    mockState.agents = [makeAgent({ apiServerPort: null })];
    const agentsLib = await import('@/src/lib/agents');
    vi.mocked(agentsLib.readAgentMeta).mockResolvedValueOnce({
      name: '',
      description: '',
      tags: [],
      apiServerPort: undefined,
    });
    vi.mocked(agentsLib.updateAgentMeta).mockResolvedValueOnce(null);
    vi.mocked(agentsLib.readAgentMeta).mockResolvedValueOnce(null);

    const res = await POST(makeReq({ agent: 'test-agent', action: 'install' }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('port');
  });

  it('start returns 500 when port resolution fails', async () => {
    mockState.agents = [makeAgent({ apiServerPort: null })];
    const agentsLib = await import('@/src/lib/agents');
    vi.mocked(agentsLib.readAgentMeta).mockResolvedValueOnce(null);

    const res = await POST(makeReq({ agent: 'test-agent', action: 'start' }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('port');
  });

  it('restart returns 500 when port resolution fails', async () => {
    mockState.agents = [makeAgent({ apiServerPort: null })];
    const agentsLib = await import('@/src/lib/agents');
    vi.mocked(agentsLib.readAgentMeta).mockResolvedValueOnce(null);

    const res = await POST(makeReq({ agent: 'test-agent', action: 'restart' }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('port');
  });

  // --- 12. uninstall success ---
  it('uninstall: returns { stdout, stderr, code, manager }', async () => {
    mockState.agents = [makeAgent()];
    mockState.execFileStdout = 'unloaded';
    mockState.execFileStderr = '';

    const res = await POST(makeReq({ agent: 'test-agent', action: 'uninstall' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('stdout');
    expect(body).toHaveProperty('stderr');
    expect(body).toHaveProperty('code', 0);
    expect(body).toHaveProperty('manager', 'launchd');
    // uninstall should NOT have running/pid/timedOut
    expect(body).not.toHaveProperty('running');
    expect(body).not.toHaveProperty('pid');
    expect(body).not.toHaveProperty('timedOut');
  });
});
