// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- hoisted mock state ---
const mockState = vi.hoisted(() => ({
  agentRows: [] as Record<string, unknown>[],
  skillLinkRows: [] as Record<string, unknown>[],
  insertedValues: null as Record<string, unknown> | null,
  deletedId: null as number | null,
  fsEntries: {} as Record<string, { isDirectory: () => boolean; name: string }[]>,
  fsStat: {} as Record<string, { isDirectory: () => boolean }>,
  fsLstat: {} as Record<string, boolean>, // path -> exists
  symlinkCalls: [] as { src: string; dest: string }[],
  unlinkCalls: [] as string[],
  mkdirCalls: [] as string[],
}));

// --- mock @/src/lib/db ---
vi.mock('@/src/lib/db', async () => {
  const { agents, envVars, skillLinks } = await import('../../db/schema');

  function makeSelectChain(resolveWith: unknown) {
    const thenable = {
      then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
        Promise.resolve(resolveWith).then(res, rej),
      catch: (cb: (e: unknown) => unknown) => Promise.resolve(resolveWith).catch(cb),
      finally: (cb: () => void) => Promise.resolve(resolveWith).finally(cb),
    };
    return {
      ...thenable,
      where: () => ({ ...thenable, where: () => thenable }),
    };
  }

  const db = {
    select: () => ({
      from: (table: unknown) => {
        // distinguish by table reference
        if (table === agents) {
          return makeSelectChain(mockState.agentRows);
        }
        return makeSelectChain(mockState.skillLinkRows);
      },
    }),
    insert: () => ({
      values: (vals: Record<string, unknown>) => {
        mockState.insertedValues = vals;
        return Promise.resolve();
      },
    }),
    delete: () => ({
      where: (condition: unknown) => {
        void condition;
        mockState.deletedId = 1; // just track that delete was called
        return Promise.resolve();
      },
    }),
  };

  return { db, schema: { agents, envVars, skillLinks } };
});

// --- mock node:fs ---
vi.mock('node:fs', () => ({
  default: {
    readdirSync: vi.fn((dir: string) => {
      return mockState.fsEntries[dir] ?? [];
    }),
    statSync: vi.fn((p: string) => {
      const stat = mockState.fsStat[p];
      if (!stat) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      return stat;
    }),
    lstatSync: vi.fn((p: string) => {
      if (!mockState.fsLstat[p]) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      return { isSymbolicLink: () => true };
    }),
    symlinkSync: vi.fn((src: string, dest: string) => {
      mockState.symlinkCalls.push({ src, dest });
    }),
    unlinkSync: vi.fn((p: string) => {
      mockState.unlinkCalls.push(p);
    }),
    mkdirSync: vi.fn((p: string) => {
      mockState.mkdirCalls.push(p);
    }),
  },
}));

import { DELETE, GET as GET_LINKS, POST } from '../../app/api/skills/links/route';
import { GET as GET_TREE } from '../../app/api/skills/tree/route';
import { walkSkillsTree } from '../../src/lib/skills';

function makeReq(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(url, init);
}

const ALPHA = {
  id: 1,
  name: 'alpha',
  home: '/agents/alpha',
  label: 'ai.hermes.gateway.alpha',
  enabled: false,
  createdAt: new Date(),
};

// ---- Tree walk unit tests ----

describe('walkSkillsTree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.fsEntries = {};
  });

  it('returns empty array when directory does not exist', () => {
    const result = walkSkillsTree('/nonexistent');
    expect(result).toEqual([]);
  });

  it('returns flat list of entries', () => {
    mockState.fsEntries['/root'] = [
      { name: 'coding', isDirectory: () => true },
      { name: 'README.md', isDirectory: () => false },
    ];
    mockState.fsEntries['/root/coding'] = [];

    const result = walkSkillsTree('/root');
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ name: 'coding', isDir: true });
    expect(result[1]).toMatchObject({ name: 'README.md', isDir: false });
  });

  it('respects depth limit', () => {
    // Build 6-level deep structure
    let current = '/root';
    for (let i = 0; i < 6; i++) {
      mockState.fsEntries[current] = [{ name: `level${i}`, isDirectory: () => true }];
      current = `${current}/level${i}`;
    }
    mockState.fsEntries[current] = [{ name: 'deep', isDirectory: () => false }];

    const result = walkSkillsTree('/root', 5);
    // Traverse 5 levels — the 6th level should not appear
    let node = result[0];
    let depth = 1;
    while (node?.children?.length) {
      node = node.children[0];
      depth++;
    }
    expect(depth).toBeLessThanOrEqual(5);
    // At depth limit, children is empty (no deeper traversal)
    expect(node?.children).toEqual([]);
  });
});

// ---- GET /api/skills/tree ----

describe('GET /api/skills/tree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.fsEntries = {};
  });

  it('returns empty tree when skills root missing', async () => {
    const res = await GET_TREE();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ tree: [] });
  });
});

// ---- GET /api/skills/links ----

describe('GET /api/skills/links', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.skillLinkRows = [];
    mockState.fsLstat = {};
  });

  it('returns 400 if agent param missing', async () => {
    const res = await GET_LINKS(makeReq('http://localhost/api/skills/links'));
    expect(res.status).toBe(400);
  });

  it('returns empty array when no links', async () => {
    mockState.skillLinkRows = [];
    const res = await GET_LINKS(makeReq('http://localhost/api/skills/links?agent=alpha'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('returns links with exists=true when symlink present', async () => {
    mockState.skillLinkRows = [
      {
        id: 1,
        agent: 'alpha',
        sourcePath: '/hermes/skills/coding',
        targetPath: '/agents/alpha/skills/coding',
      },
    ];
    mockState.fsLstat['/agents/alpha/skills/coding'] = true;
    const res = await GET_LINKS(makeReq('http://localhost/api/skills/links?agent=alpha'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0].exists).toBe(true);
  });

  it('returns links with exists=false when symlink missing (stale link)', async () => {
    mockState.skillLinkRows = [
      {
        id: 2,
        agent: 'alpha',
        sourcePath: '/hermes/skills/writing',
        targetPath: '/agents/alpha/skills/writing',
      },
    ];
    // fsLstat doesn't have this path → lstatSync will throw ENOENT
    const res = await GET_LINKS(makeReq('http://localhost/api/skills/links?agent=alpha'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0].exists).toBe(false);
  });
});

// ---- POST /api/skills/links ----

describe('POST /api/skills/links', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.agentRows = [];
    mockState.skillLinkRows = [];
    mockState.insertedValues = null;
    mockState.symlinkCalls = [];
    mockState.mkdirCalls = [];
    mockState.fsStat = {};
  });

  it('returns 400 for invalid JSON', async () => {
    const res = await POST(
      makeReq('http://localhost/api/skills/links', {
        method: 'POST',
        body: 'not-json',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown agent', async () => {
    mockState.agentRows = [];
    const res = await POST(
      makeReq('http://localhost/api/skills/links', {
        method: 'POST',
        body: JSON.stringify({ agent: 'ghost', sourcePath: '/hermes/skills/coding' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(404);
  });

  it('creates symlink and inserts row', async () => {
    mockState.agentRows = [ALPHA];
    mockState.skillLinkRows = [];
    mockState.fsStat['/hermes/skills/coding'] = { isDirectory: () => true };

    const res = await POST(
      makeReq('http://localhost/api/skills/links', {
        method: 'POST',
        body: JSON.stringify({ agent: 'alpha', sourcePath: '/hermes/skills/coding' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.targetPath).toContain('coding');
    expect(mockState.symlinkCalls).toHaveLength(1);
    expect(mockState.insertedValues).not.toBeNull();
  });

  it('uses parent directory when sourcePath is a file', async () => {
    mockState.agentRows = [ALPHA];
    mockState.skillLinkRows = [];
    mockState.fsStat['/hermes/skills/coding/SKILL.md'] = { isDirectory: () => false };

    const res = await POST(
      makeReq('http://localhost/api/skills/links', {
        method: 'POST',
        body: JSON.stringify({ agent: 'alpha', sourcePath: '/hermes/skills/coding/SKILL.md' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    // basename of parent (/hermes/skills/coding) → "coding"
    expect(body.targetPath).toContain('coding');
    expect(mockState.symlinkCalls[0].src).toBe('/hermes/skills/coding');
  });

  it('returns 409 on duplicate link', async () => {
    mockState.agentRows = [ALPHA];
    mockState.skillLinkRows = [
      {
        id: 1,
        agent: 'alpha',
        sourcePath: '/hermes/skills/coding',
        targetPath: '/agents/alpha/skills/coding',
      },
    ];

    const res = await POST(
      makeReq('http://localhost/api/skills/links', {
        method: 'POST',
        body: JSON.stringify({ agent: 'alpha', sourcePath: '/hermes/skills/coding' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(409);
  });
});

// ---- DELETE /api/skills/links ----

describe('DELETE /api/skills/links', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.skillLinkRows = [];
    mockState.deletedId = null;
    mockState.unlinkCalls = [];
    mockState.fsLstat = {};
  });

  it('returns 400 if id param missing', async () => {
    const res = await DELETE(makeReq('http://localhost/api/skills/links', { method: 'DELETE' }));
    expect(res.status).toBe(400);
  });

  it('returns 404 if link not found', async () => {
    mockState.skillLinkRows = [];
    const res = await DELETE(
      makeReq('http://localhost/api/skills/links?id=99', { method: 'DELETE' }),
    );
    expect(res.status).toBe(404);
  });

  it('removes symlink and deletes DB row', async () => {
    mockState.skillLinkRows = [
      {
        id: 5,
        agent: 'alpha',
        sourcePath: '/hermes/skills/coding',
        targetPath: '/agents/alpha/skills/coding',
      },
    ];
    mockState.fsLstat['/agents/alpha/skills/coding'] = true;

    const res = await DELETE(
      makeReq('http://localhost/api/skills/links?id=5', { method: 'DELETE' }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockState.unlinkCalls).toContain('/agents/alpha/skills/coding');
    expect(mockState.deletedId).not.toBeNull();
  });

  it('succeeds even when symlink already missing (ENOENT ignored)', async () => {
    mockState.skillLinkRows = [
      {
        id: 7,
        agent: 'alpha',
        sourcePath: '/hermes/skills/writing',
        targetPath: '/agents/alpha/skills/writing',
      },
    ];
    // fsLstat not set → unlinkSync will throw ENOENT

    const res = await DELETE(
      makeReq('http://localhost/api/skills/links?id=7', { method: 'DELETE' }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
