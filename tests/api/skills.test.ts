// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DELETE, GET as GET_LINKS, POST } from '../../app/api/skills/links/route';
import { GET as GET_TREE } from '../../app/api/skills/tree/route';
import type { Agent } from '../../src/lib/agents';
import type { SkillLink } from '../../src/lib/skill-links';
import { walkSkillsTree } from '../../src/lib/skills';

// --- hoisted mock state ---
const mockState = vi.hoisted(() => ({
  agent: null as Agent | null,
  skillLinks: [] as SkillLink[],
  createdTargetPath: null as string | null,
  deletedTargetPath: null as string | null,
  linkExists: false,
  fsEntries: {} as Record<string, { isDirectory: () => boolean; name: string }[]>,
  fsStat: {} as Record<string, { isDirectory: () => boolean }>,
  fsLstat: {} as Record<string, boolean>,
  symlinkCalls: [] as { src: string; dest: string }[],
  unlinkCalls: [] as string[],
  mkdirCalls: [] as string[],
}));

// --- mock @/src/lib/agents ---
vi.mock('@/src/lib/agents', () => ({
  getAgent: vi.fn(async () => mockState.agent),
}));

// --- mock @/src/lib/skill-links ---
vi.mock('@/src/lib/skill-links', () => ({
  listSkillLinks: vi.fn(async () => mockState.skillLinks),
  createSkillLink: vi.fn(async (_home: string, _src: string, relPath: string) => {
    const targetPath = `${mockState.agent?.home}/skills/${relPath}`;
    mockState.createdTargetPath = targetPath;
    return targetPath;
  }),
  deleteSkillLink: vi.fn(async (_home: string, targetPath: string) => {
    mockState.deletedTargetPath = targetPath;
  }),
  skillLinkExists: vi.fn(async () => mockState.linkExists),
}));

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
    rmdirSync: vi.fn(() => {}),
  },
}));

function makeReq(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(url, init);
}

const ALPHA: Agent = {
  agentId: 'alpha',
  home: '/runtime/agents/alpha',
  label: 'ai.hermes.gateway.alpha',
  enabled: false,
  createdAt: new Date(),
  updatedAt: new Date(),
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

    const result = walkSkillsTree('/root');
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
    mockState.agent = null;
    mockState.skillLinks = [];
  });

  it('returns 400 if agent param missing', async () => {
    const res = await GET_LINKS(makeReq('http://localhost/api/skills/links'));
    expect(res.status).toBe(400);
  });

  it('returns 404 if agent not found', async () => {
    mockState.agent = null;
    const res = await GET_LINKS(makeReq('http://localhost/api/skills/links?agent=ghost'));
    expect(res.status).toBe(404);
  });

  it('returns empty array when no links', async () => {
    mockState.agent = ALPHA;
    mockState.skillLinks = [];
    const res = await GET_LINKS(makeReq('http://localhost/api/skills/links?agent=alpha'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('returns links with exists=true', async () => {
    mockState.agent = ALPHA;
    mockState.skillLinks = [
      {
        agent: 'alpha',
        sourcePath: '/home/user/.agents/skills/coding',
        targetPath: '/runtime/agents/alpha/skills/coding',
        relativePath: 'coding',
        exists: true,
      },
    ];
    const res = await GET_LINKS(makeReq('http://localhost/api/skills/links?agent=alpha'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0].exists).toBe(true);
    expect(body[0].relativePath).toBe('coding');
  });
});

// ---- POST /api/skills/links ----

describe('POST /api/skills/links', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.agent = null;
    mockState.skillLinks = [];
    mockState.createdTargetPath = null;
    mockState.linkExists = false;
    mockState.fsStat = {};
    mockState.symlinkCalls = [];
    mockState.mkdirCalls = [];
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
    mockState.agent = null;
    const res = await POST(
      makeReq('http://localhost/api/skills/links', {
        method: 'POST',
        body: JSON.stringify({ agent: 'ghost', relativePath: 'coding' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(404);
  });

  it('creates skill link with relative path', async () => {
    mockState.agent = ALPHA;
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
  });

  it('returns 400 when source has no SKILL.md', async () => {
    mockState.agent = ALPHA;
    const home = process.env.HOME || '/home/user';
    const skillsRoot = `${home}/.agents/skills`;
    mockState.fsStat[`${skillsRoot}/category`] = { isDirectory: () => true };

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

  it('returns 409 on duplicate target path', async () => {
    mockState.agent = ALPHA;
    mockState.linkExists = true;
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
    mockState.agent = null;
    mockState.deletedTargetPath = null;
    mockState.linkExists = false;
  });

  it('returns 400 if agent param missing', async () => {
    const res = await DELETE(
      makeReq('http://localhost/api/skills/links?path=coding', { method: 'DELETE' }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 if path param missing', async () => {
    const res = await DELETE(
      makeReq('http://localhost/api/skills/links?agent=alpha', { method: 'DELETE' }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 if agent not found', async () => {
    mockState.agent = null;
    const res = await DELETE(
      makeReq('http://localhost/api/skills/links?agent=ghost&path=coding', { method: 'DELETE' }),
    );
    expect(res.status).toBe(404);
  });

  it('returns 404 if link not found', async () => {
    mockState.agent = ALPHA;
    mockState.linkExists = false;
    const res = await DELETE(
      makeReq('http://localhost/api/skills/links?agent=alpha&path=missing', { method: 'DELETE' }),
    );
    expect(res.status).toBe(404);
  });

  it('removes symlink and returns ok', async () => {
    mockState.agent = ALPHA;
    mockState.linkExists = true;
    const res = await DELETE(
      makeReq('http://localhost/api/skills/links?agent=alpha&path=coding', { method: 'DELETE' }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockState.deletedTargetPath).toBe('/runtime/agents/alpha/skills/coding');
  });
});
