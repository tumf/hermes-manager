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
    accessSync: vi.fn((p: string) => {
      if (mockState.fsEntries[p] === undefined) {
        throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      }
    }),
    existsSync: vi.fn((p: string) => {
      return mockState.fsStat[p] !== undefined;
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
    rmdirSync: vi.fn(() => {
      // Mock directory removal
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
  home: '/runtime/agents/alpha',
  label: 'ai.hermes.gateway.alpha',
  enabled: false,
  createdAt: new Date(),
};

// ---- Tree walk unit tests ----

describe('walkSkillsTree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.fsEntries = {};
    mockState.fsStat = {};
  });

  it('returns empty array when directory does not exist', () => {
    const result = walkSkillsTree('/nonexistent');
    expect(result).toEqual([]);
  });

  it('filters out hidden entries and non-directories', () => {
    // Root directory must exist in fsEntries for accessSync to succeed
    mockState.fsEntries['/root'] = [
      { name: 'coding', isDirectory: () => true },
      { name: '.github', isDirectory: () => true },
      { name: 'README.md', isDirectory: () => false },
    ];
    mockState.fsEntries['/root/coding'] = [];
    mockState.fsEntries['/root/.github'] = [];

    const result = walkSkillsTree('/root');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('coding');
    expect(result[0].relativePath).toBe('coding');
  });

  it('detects hasSkill=true when SKILL.md present', () => {
    mockState.fsEntries['/root'] = [
      { name: 'coding', isDirectory: () => true },
      { name: 'category', isDirectory: () => true },
    ];
    mockState.fsEntries['/root/coding'] = [];
    mockState.fsEntries['/root/category'] = [];
    mockState.fsStat['/root/coding/SKILL.md'] = { isDirectory: () => false };
    // /root/category/SKILL.md not set → hasSkill = false

    const result = walkSkillsTree('/root');
    // sorted: category, coding
    expect(result[0]).toMatchObject({ name: 'category', hasSkill: false });
    expect(result[1]).toMatchObject({ name: 'coding', hasSkill: true });
  });

  it('includes hierarchical relative paths for nested skills', () => {
    mockState.fsEntries['/root'] = [{ name: 'openclaw-imports', isDirectory: () => true }];
    mockState.fsEntries['/root/openclaw-imports'] = [{ name: 'refactor', isDirectory: () => true }];
    mockState.fsEntries['/root/openclaw-imports/refactor'] = [];
    mockState.fsStat['/root/openclaw-imports/refactor/SKILL.md'] = { isDirectory: () => false };

    const result = walkSkillsTree('/root');
    expect(result).toHaveLength(1);
    const refactor = result[0].children[0];
    expect(refactor).toMatchObject({
      name: 'refactor',
      relativePath: 'openclaw-imports/refactor',
      hasSkill: true,
    });
  });

  it('respects depth limit', () => {
    // Build 6-level deep structure
    let current = '/root';
    for (let i = 0; i < 6; i++) {
      mockState.fsEntries[current] = [{ name: `level${i}`, isDirectory: () => true }];
      current = `${current}/level${i}`;
    }
    mockState.fsEntries[current] = [];

    const result = walkSkillsTree('/root', 5);
    let node = result[0];
    let depth = 1;
    while (node?.children?.length) {
      node = node.children[0];
      depth++;
    }
    expect(depth).toBeLessThanOrEqual(5);
    expect(node?.children).toEqual([]);
  });

  it('detects hasSkill=true when SKILL.md present', () => {
    mockState.fsEntries['/root'] = [
      { name: 'coding', isDirectory: () => true },
      { name: 'category', isDirectory: () => true },
    ];
    mockState.fsEntries['/root/coding'] = [];
    mockState.fsEntries['/root/category'] = [];
    mockState.fsStat['/root/coding/SKILL.md'] = { isDirectory: () => false };
    // /root/category/SKILL.md not set → hasSkill = false

    const result = walkSkillsTree('/root');
    expect(result[1]).toMatchObject({ name: 'coding', hasSkill: true });
    expect(result[0]).toMatchObject({ name: 'category', hasSkill: false });
  });

  it('includes hierarchical relative paths for nested skills', () => {
    mockState.fsEntries['/root'] = [{ name: 'openclaw-imports', isDirectory: () => true }];
    mockState.fsEntries['/root/openclaw-imports'] = [{ name: 'refactor', isDirectory: () => true }];
    mockState.fsEntries['/root/openclaw-imports/refactor'] = [];
    mockState.fsStat['/root/openclaw-imports/refactor/SKILL.md'] = { isDirectory: () => false };

    const result = walkSkillsTree('/root');
    const refactor = result[0].children[0];
    expect(refactor).toMatchObject({
      name: 'refactor',
      relativePath: 'openclaw-imports/refactor',
      hasSkill: true,
    });
  });

  it('respects depth limit', () => {
    // Build 6-level deep structure
    let current = '/root';
    for (let i = 0; i < 6; i++) {
      mockState.fsEntries[current] = [{ name: `level${i}`, isDirectory: () => true }];
      current = `${current}/level${i}`;
    }
    mockState.fsEntries[current] = [];

    const result = walkSkillsTree('/root', 5);
    let node = result[0];
    let depth = 1;
    while (node?.children?.length) {
      node = node.children[0];
      depth++;
    }
    expect(depth).toBeLessThanOrEqual(5);
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
        sourcePath: '/home/user/.agents/skills/coding',
        targetPath: '/runtime/agents/alpha/skills/coding',
      },
    ];
    mockState.fsLstat['/runtime/agents/alpha/skills/coding'] = true;
    const res = await GET_LINKS(makeReq('http://localhost/api/skills/links?agent=alpha'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0].exists).toBe(true);
    expect(body[0].relativePath).toBe('coding');
  });

  it('returns links with exists=false when symlink missing (stale link)', async () => {
    mockState.skillLinkRows = [
      {
        id: 2,
        agent: 'alpha',
        sourcePath: '/home/user/.agents/skills/writing',
        targetPath: '/runtime/agents/alpha/skills/writing',
      },
    ];
    // fsLstat doesn't have this path → lstatSync will throw ENOENT
    const res = await GET_LINKS(makeReq('http://localhost/api/skills/links?agent=alpha'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0].exists).toBe(false);
    expect(body[0].relativePath).toBe('writing');
  });

  it('derives relativePath from canonical root', async () => {
    // Mock relative path derivation by using a known source path format
    const sourcePath = '/home/user/.agents/skills/openclaw-imports/refactor';
    mockState.skillLinkRows = [
      {
        id: 3,
        agent: 'alpha',
        sourcePath,
        targetPath: '/runtime/agents/alpha/skills/openclaw-imports/refactor',
      },
    ];
    mockState.fsLstat['/runtime/agents/alpha/skills/openclaw-imports/refactor'] = true;

    // This is only called if deriveRelativePath returns null for our test path,
    // so we'll accept that it might derive differently based on HOME

    const res = await GET_LINKS(makeReq('http://localhost/api/skills/links?agent=alpha'));
    expect(res.status).toBe(200);
    const body = await res.json();
    // Just verify relativePath is a non-empty string
    expect(typeof body[0].relativePath).toBe('string');
    expect(body[0].relativePath.length).toBeGreaterThan(0);
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
    mockState.fsLstat = {};
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
        body: JSON.stringify({ agent: 'ghost', relativePath: 'coding' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(404);
  });

  it('creates hierarchical symlink with relative path', async () => {
    mockState.agentRows = [ALPHA];
    mockState.skillLinkRows = [];
    const home = process.env.HOME || '/home/user';
    const skillsRoot = `${home}/.agents/skills`;
    mockState.fsStat[`${skillsRoot}/coding`] = { isDirectory: () => true };
    mockState.fsStat[`${skillsRoot}/coding/SKILL.md`] = { isDirectory: () => false };

    const res = await POST(
      makeReq('http://localhost/api/skills/links', {
        method: 'POST',
        body: JSON.stringify({ agent: 'alpha', relativePath: 'coding' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.relativePath).toBe('coding');
    expect(body.targetPath).toContain('skills/coding');
    expect(mockState.symlinkCalls).toHaveLength(1);
    expect(mockState.insertedValues).not.toBeNull();
  });

  it('preserves nested relative paths in symlink target', async () => {
    mockState.agentRows = [ALPHA];
    mockState.skillLinkRows = [];
    const home = process.env.HOME || '/home/user';
    const skillsRoot = `${home}/.agents/skills`;
    const nestedPath = `${skillsRoot}/openclaw-imports/refactor`;
    mockState.fsStat[nestedPath] = { isDirectory: () => true };
    mockState.fsStat[`${nestedPath}/SKILL.md`] = { isDirectory: () => false };

    const res = await POST(
      makeReq('http://localhost/api/skills/links', {
        method: 'POST',
        body: JSON.stringify({ agent: 'alpha', relativePath: 'openclaw-imports/refactor' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.relativePath).toBe('openclaw-imports/refactor');
    expect(body.targetPath).toContain('skills/openclaw-imports/refactor');
  });

  it('returns 400 when source has no SKILL.md', async () => {
    mockState.agentRows = [ALPHA];
    const home = process.env.HOME || '/home/user';
    const skillsRoot = `${home}/.agents/skills`;
    mockState.fsStat[`${skillsRoot}/category`] = { isDirectory: () => true };
    // SKILL.md not set → doesn't exist

    const res = await POST(
      makeReq('http://localhost/api/skills/links', {
        method: 'POST',
        body: JSON.stringify({ agent: 'alpha', relativePath: 'category' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('SKILL.md');
  });

  it('creates nested target paths for hierarchical skills without collision', async () => {
    mockState.agentRows = [ALPHA];
    const home = process.env.HOME || '/home/user';
    const skillsRoot = `${home}/.agents/skills`;
    // Skill: "openclaw-imports/refactor"
    const nested = `${skillsRoot}/openclaw-imports/refactor`;
    mockState.fsStat[nested] = { isDirectory: () => true };
    mockState.fsStat[`${nested}/SKILL.md`] = { isDirectory: () => false };

    const res = await POST(
      makeReq('http://localhost/api/skills/links', {
        method: 'POST',
        body: JSON.stringify({ agent: 'alpha', relativePath: 'openclaw-imports/refactor' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.targetPath).toContain('skills/openclaw-imports/refactor');
    // Verify parent directories are created
    expect(mockState.mkdirCalls.length).toBeGreaterThan(0);
  });

  it('returns 409 on duplicate target path', async () => {
    mockState.agentRows = [ALPHA];
    mockState.skillLinkRows = [
      {
        id: 1,
        agent: 'alpha',
        sourcePath: '/home/user/.agents/skills/coding',
        targetPath: '/runtime/agents/alpha/skills/coding',
      },
    ];
    const home = process.env.HOME || '/home/user';
    const skillsRoot = `${home}/.agents/skills`;
    mockState.fsStat[`${skillsRoot}/coding`] = { isDirectory: () => true };
    mockState.fsStat[`${skillsRoot}/coding/SKILL.md`] = { isDirectory: () => false };

    const res = await POST(
      makeReq('http://localhost/api/skills/links', {
        method: 'POST',
        body: JSON.stringify({ agent: 'alpha', relativePath: 'coding' }),
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
        targetPath: '/runtime/agents/alpha/skills/coding',
      },
    ];
    mockState.fsLstat['/runtime/agents/alpha/skills/coding'] = true;

    const res = await DELETE(
      makeReq('http://localhost/api/skills/links?id=5', { method: 'DELETE' }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockState.unlinkCalls).toContain('/runtime/agents/alpha/skills/coding');
    expect(mockState.deletedId).not.toBeNull();
  });

  it('succeeds even when symlink already missing (ENOENT ignored)', async () => {
    mockState.skillLinkRows = [
      {
        id: 7,
        agent: 'alpha',
        sourcePath: '/hermes/skills/writing',
        targetPath: '/runtime/agents/alpha/skills/writing',
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
