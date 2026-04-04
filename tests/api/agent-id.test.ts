// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  agent: {
    agentId: 'alpha',
    home: '/runtime/agents/alpha',
    label: 'ai.hermes.gateway.alpha',
    enabled: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    name: 'Alpha',
    description: '',
    tags: [],
    apiServerStatus: 'configured-needs-restart' as const,
    apiServerAvailable: false,
    apiServerPort: null,
  } as {
    agentId: string;
    home: string;
    label: string;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
    name: string;
    description: string;
    tags: string[];
    apiServerStatus: 'configured-needs-restart';
    apiServerAvailable: boolean;
    apiServerPort: null;
  } | null,
  partialModeEnabled: false,
}));

vi.mock('@/src/lib/agents', () => ({
  getAgent: vi.fn(async () => mockState.agent),
}));

vi.mock('node:fs/promises', () => ({
  default: {
    readFile: vi.fn(async (targetPath: string) => {
      if (targetPath.endsWith('SOUL.src.md') && mockState.partialModeEnabled) {
        return '# Soul source';
      }
      throw new Error('ENOENT');
    }),
  },
}));

import { GET } from '../../app/api/agents/[id]/route';

describe('GET /api/agents/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.partialModeEnabled = false;
  });

  it('returns apiServerStatus in payload', async () => {
    const res = await GET(new Request('http://localhost') as never, {
      params: Promise.resolve({ id: 'alpha' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.apiServerStatus).toBe('configured-needs-restart');
    expect(body.apiServerAvailable).toBe(false);
    expect(body.partialModeEnabled).toBe(false);
  });

  it('returns partialModeEnabled=true when SOUL.src.md exists', async () => {
    mockState.partialModeEnabled = true;

    const res = await GET(new Request('http://localhost') as never, {
      params: Promise.resolve({ id: 'alpha' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.partialModeEnabled).toBe(true);
  });

  it('returns 400 for traversal-like id', async () => {
    const res = await GET(new Request('http://localhost') as never, {
      params: Promise.resolve({ id: '../etc' }),
    });

    expect(res.status).toBe(400);
  });
});
