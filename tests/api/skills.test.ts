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
  deleteMode: 'post' as 'post' | 'delete',
  fsEntries: {} as Record<string, { isDirectory: () => boolean; name: string }[]>,
  fsStat: {} as Record<string, { isDirectory: () => boolean; isFile?: () => boolean }>,
  fsReaddirPaths: [] as string[],
  fsLstat: {} as Record<string, boolean>,
  symlinkCalls: [] as { src: string; dest: string }[],
  unlinkCalls: [] as string[],
  mkdirCalls: [] as string[],
  rmCalls: [] as string[],
  cpCalls: [] as { from: string; to: string }[],
  copyError: null as Error | null,
  existingSource: new Set<string>(),
}));

// --- mock @/src/lib/agents ---
vi.mock('@/src/lib/agents', () => ({
  getAgent: vi.fn(async () => mockState.agent),
}));

// --- mock @/src/lib/skill-links ---
vi.mock('@/src/lib/skill-links', async () => {
  const actual = await vi.importActual<typeof import('../../src/lib/skill-links')>(
    '../../src/lib/skill-links',
  );
  return {
    ...actual,
    createSkillLink: vi.fn(async (_home: string, _sourcePath: string, relativePath: string) => {
      if (mockState.copyError) {
        throw mockState.copyError;
      }
      const targetPath = `${mockState.agent?.home}/skills/${relativePath}`;
      if (mockState.existingSource.has(targetPath)) {
        const error = new Error('target exists') as Error & { code?: string };
        error.code = 'EEXIST';
        throw error;
      }
      mockState.existingSource.add(targetPath);
      mockState.createdTargetPath = targetPath;
      return targetPath;
    }),
    deleteSkillLink: vi.fn(async (_home: string, targetPath: string) => {
      if (mockState.copyError) {
        throw mockState.copyError;
      }
      mockState.deletedTargetPath = targetPath;
      mockState.existingSource.delete(targetPath);
    }),
    listSkillLinks: vi.fn(async () => mockState.skillLinks),
    skillLinkExists: vi.fn(async (targetPath: string) => mockState.existingSource.has(targetPath)),
  };
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
      return { isSymbolicLink: () => false, isDirectory: () => true };
    }),
    accessSync: vi.fn((p: string) => {
      if (mockState.fsEntries[p] === undefined && !mockState.fsStat[p] && !mockState.fsLstat[p]) {
        throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      }
    }),
    existsSync: vi.fn((p: string) => {
      return mockState.fsStat[p] !== undefined || mockState.fsLstat[p] !== undefined;
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
    readlinkSync: vi.fn(() => '/some/target'),
    renameSync: vi.fn(() => {}),
  },
}));

// --- mock node:fs/promises ---
vi.mock('node:fs/promises', () => ({
  readdir: vi.fn((dir: string) => {
    mockState.fsReaddirPaths.push(dir);
    return Promise.resolve([] as { name: string; isDirectory: () => boolean }[]);
  }),
  stat: vi.fn((p: string) => {
    const stat = mockState.fsStat[p];
    if (!stat) {
      return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    }
    return Promise.resolve(stat);
  }),
  lstat: vi.fn((p: string) => {
    if (!mockState.fsLstat[p])
      return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    return Promise.resolve({ isDirectory: () => true, isSymbolicLink: () => false });
  }),
  mkdir: vi.fn((p: string) => {
    mockState.mkdirCalls.push(p);
    return Promise.resolve();
  }),
  cp: vi.fn((from: string, to: string) => {
    mockState.cpCalls.push({ from, to });
    if (mockState.copyError) {
      return Promise.reject(mockState.copyError);
    }
    return Promise.resolve();
  }),
  rm: vi.fn((p: string) => {
    mockState.deletedTargetPath = p;
    if (mockState.copyError) {
      return Promise.reject(mockState.copyError);
    }
    return Promise.resolve();
  }),
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
  name: '',
  description: '',
  tags: [],
  apiServerAvailable: false,
  apiServerPort: null,
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
        sourcePath: '/runtime/agents/alpha/skills/coding',
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
    mockState.deletedTargetPath = null;
    mockState.deleteMode = 'post';
    mockState.fsStat = {};
    mockState.fsReaddirPaths = [];
    mockState.cpCalls = [];
    mockState.copyError = null;
    mockState.existingSource = new Set();
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

  it('creates skill copy with valid path', async () => {
    mockState.agent = ALPHA;
    const home = process.env.HOME || '/home/user';
    const skillsRoot = `${home}/.agents/skills`;
    mockState.fsStat[`${skillsRoot}/coding`] = { isDirectory: () => true };
    mockState.fsStat[`${skillsRoot}/coding/SKILL.md`] = {
      isDirectory: () => false,
      isFile: () => true,
    };

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
    expect(mockState.createdTargetPath).toBe('/runtime/agents/alpha/skills/coding');
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
    mockState.skillLinks = [
      {
        agent: 'alpha',
        sourcePath: '/Users/tumf/.agents/skills/coding',
        targetPath: '/runtime/agents/alpha/skills/coding',
        relativePath: 'coding',
        exists: true,
      },
    ];
    mockState.existingSource.add('/runtime/agents/alpha/skills/coding');

    const home = process.env.HOME || '/home/user';
    const skillsRoot = `${home}/.agents/skills`;
    mockState.fsStat[`${skillsRoot}/coding`] = { isDirectory: () => true };
    mockState.fsStat[`${skillsRoot}/coding/SKILL.md`] = {
      isDirectory: () => false,
      isFile: () => true,
    };

    const res = await POST(
      makeReq('http://localhost/api/skills/links', {
        method: 'POST',
        body: JSON.stringify({ agent: 'alpha', relativePath: 'coding' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(409);
  });

  it('returns 500 when copy fails', async () => {
    mockState.agent = ALPHA;
    mockState.copyError = new Error('failed to copy');
    const home = process.env.HOME || '/home/user';
    const skillsRoot = `${home}/.agents/skills`;
    mockState.fsStat[`${skillsRoot}/coding`] = { isDirectory: () => true };
    mockState.fsStat[`${skillsRoot}/coding/SKILL.md`] = {
      isDirectory: () => false,
      isFile: () => true,
    };

    const res = await POST(
      makeReq('http://localhost/api/skills/links', {
        method: 'POST',
        body: JSON.stringify({ agent: 'alpha', relativePath: 'coding' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining('Failed to copy skill directory'),
    });
  });

  it('returns 400 on traversal path in relativePath', async () => {
    mockState.agent = ALPHA;
    const res = await POST(
      makeReq('http://localhost/api/skills/links', {
        method: 'POST',
        body: JSON.stringify({ agent: 'alpha', relativePath: '../etc/passwd' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(400);
  });
});

// ---- DELETE /api/skills/links ----

describe('DELETE /api/skills/links', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.agent = null;
    mockState.deletedTargetPath = null;
    mockState.deleteMode = 'delete';
    mockState.existingSource = new Set();
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
    const res = await DELETE(
      makeReq('http://localhost/api/skills/links?agent=alpha&path=missing', { method: 'DELETE' }),
    );
    expect(res.status).toBe(404);
  });

  it('removes copied skill directory and returns ok', async () => {
    mockState.agent = ALPHA;
    mockState.existingSource.add('/runtime/agents/alpha/skills/coding');

    const res = await DELETE(
      makeReq('http://localhost/api/skills/links?agent=alpha&path=coding', { method: 'DELETE' }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockState.deletedTargetPath).toBe('/runtime/agents/alpha/skills/coding');
  });

  it('returns 500 if delete fails', async () => {
    mockState.agent = ALPHA;
    mockState.existingSource.add('/runtime/agents/alpha/skills/coding');
    mockState.copyError = new Error('failed to delete');

    const res = await DELETE(
      makeReq('http://localhost/api/skills/links?agent=alpha&path=coding', { method: 'DELETE' }),
    );
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining('Failed to remove copied skill'),
    });

    mockState.copyError = null;
  });
});
