import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import '@testing-library/jest-dom';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

let SkillsTabComponent: React.ComponentType<any>;
let collectDescendantSkillPathsFn: any;

const sampleTree = {
  tree: [
    {
      name: 'mini-ops',
      relativePath: 'mini-ops',
      hasSkill: false,
      children: [
        {
          name: 'caddy-recovery',
          relativePath: 'mini-ops/caddy-recovery',
          hasSkill: true,
          children: [],
        },
        {
          name: 'flowise',
          relativePath: 'mini-ops/flowise',
          hasSkill: true,
          children: [],
        },
      ],
    },
    {
      name: 'coding',
      relativePath: 'coding',
      hasSkill: true,
      children: [],
    },
    {
      name: 'research',
      relativePath: 'research',
      hasSkill: false,
      children: [
        {
          name: 'arxiv',
          relativePath: 'research/arxiv',
          hasSkill: true,
          children: [],
        },
      ],
    },
  ],
};

interface LinkEntry {
  id: number;
  agent: string;
  sourcePath: string;
  targetPath: string;
  exists: boolean;
  relativePath: string;
}

// Links where only 'coding' is equipped
const defaultEquippedLinks: LinkEntry[] = [
  {
    id: 1,
    agent: 'alpha',
    sourcePath: '/Users/tumf/.agents/skills/coding',
    targetPath: '/runtime/agents/alpha/skills/coding',
    exists: true,
    relativePath: 'coding',
  },
];

function createFetchMock(opts?: { equippedLinks?: LinkEntry[] }) {
  const links = opts?.equippedLinks ?? defaultEquippedLinks;
  let currentLinks = [...links];

  return vi
    .fn()
    .mockImplementation(async (url: string, init?: { method?: string; body?: string }) => {
      const method = init?.method ?? 'GET';

      if (url === '/api/skills/tree' && method === 'GET') {
        return { ok: true, json: async () => sampleTree };
      }

      if (url.startsWith('/api/skills/links?') && method === 'GET') {
        return { ok: true, json: async () => currentLinks };
      }

      if (url === '/api/skills/links' && method === 'POST') {
        const body = JSON.parse(init?.body ?? '{}');
        const newId = currentLinks.length + 100;
        const hybridRoots = new Set(['frontend-design', 'shadcn', 'skill-creator']);
        const targetPath = hybridRoots.has(body.relativePath)
          ? `/runtime/agents/${body.agent}/skills/${body.relativePath}/.skill-link`
          : `/runtime/agents/${body.agent}/skills/${body.relativePath}`;
        currentLinks.push({
          id: newId,
          agent: body.agent,
          sourcePath: `/Users/tumf/.agents/skills/${body.relativePath}`,
          targetPath,
          exists: true,
          relativePath: body.relativePath,
        });
        return { ok: true, json: async () => ({ ok: true }) };
      }

      if (url.startsWith('/api/skills/links?') && method === 'DELETE') {
        const parsed = new URL(url, 'http://localhost');
        const path = parsed.searchParams.get('path');
        currentLinks = currentLinks.filter((l) => l.relativePath !== path);
        return { ok: true, json: async () => ({ ok: true }) };
      }

      return { ok: true, json: async () => ({}) };
    });
}

beforeEach(async () => {
  const mod = await import('../../src/components/skills-tab');
  SkillsTabComponent = mod.SkillsTab;
  collectDescendantSkillPathsFn = mod.collectDescendantSkillPaths;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('collectDescendantSkillPaths', () => {
  it('collects all skill paths from a nested tree', () => {
    const paths = collectDescendantSkillPathsFn(sampleTree.tree);
    expect(paths).toEqual([
      'mini-ops/caddy-recovery',
      'mini-ops/flowise',
      'coding',
      'research/arxiv',
    ]);
  });

  it('returns empty array for empty tree', () => {
    expect(collectDescendantSkillPathsFn([])).toEqual([]);
  });

  it('collects paths only from a folder subtree', () => {
    const miniOps = sampleTree.tree[0];
    const paths = collectDescendantSkillPathsFn(miniOps.children);
    expect(paths).toEqual(['mini-ops/caddy-recovery', 'mini-ops/flowise']);
  });
});

describe('SkillsTab bulk select', () => {
  it('renders top-level Select All and Clear All buttons', async () => {
    global.fetch = createFetchMock();

    render(<SkillsTabComponent name="alpha" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Select all skills' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Clear all skills' })).toBeInTheDocument();
    });
  });

  it('Select All triggers equip requests for unequipped skills only', async () => {
    const fetchMock = createFetchMock();
    global.fetch = fetchMock;

    render(<SkillsTabComponent name="alpha" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Select all skills' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Select all skills' }));

    await waitFor(() => {
      const getCalls = (fetchMock.mock.calls as [string, { method?: string }?][]).filter(
        ([u, init]) =>
          u.startsWith('/api/skills/links?agent=') && (init?.method ?? 'GET') === 'GET',
      );
      const postCalls = (
        fetchMock.mock.calls as [string, { method?: string; body?: string }?][]
      ).filter(([u, init]) => u === '/api/skills/links' && init?.method === 'POST');

      expect(getCalls.length).toBeGreaterThan(0);
      expect(postCalls.length).toBe(3);

      const bodies = postCalls.map(([, init]) => JSON.parse(init?.body ?? '{}'));
      const paths = bodies.map((b: { relativePath: string }) => b.relativePath);
      expect(paths).toContain('mini-ops/caddy-recovery');
      expect(paths).toContain('mini-ops/flowise');
      expect(paths).toContain('research/arxiv');
      expect(paths).not.toContain('coding');
    });
  });

  it('Clear All triggers unequip requests for equipped skills only', async () => {
    const fetchMock = createFetchMock();
    global.fetch = fetchMock;

    render(<SkillsTabComponent name="alpha" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Clear all skills' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Clear all skills' }));

    await waitFor(() => {
      const getCalls = (fetchMock.mock.calls as [string, { method?: string }?][]).filter(
        ([u, init]) =>
          u.startsWith('/api/skills/links?agent=') && (init?.method ?? 'GET') === 'GET',
      );
      const deleteCalls = (fetchMock.mock.calls as [string, { method?: string }?][]).filter(
        ([u, init]) => u.startsWith('/api/skills/links?agent=') && init?.method === 'DELETE',
      );

      expect(getCalls.length).toBeGreaterThan(0);
      expect(deleteCalls.length).toBe(1);
      expect(deleteCalls[0]?.[0]).toContain('path=coding');
    });
  });

  it('renders folder-level bulk controls on folder nodes', async () => {
    global.fetch = createFetchMock();

    render(<SkillsTabComponent name="alpha" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Select all in mini-ops' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Clear all in mini-ops' })).toBeInTheDocument();
    });
  });

  it('folder Select All equips only descendant skills in that folder subtree', async () => {
    const fetchMock = createFetchMock();
    global.fetch = fetchMock;

    render(<SkillsTabComponent name="alpha" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Select all in mini-ops' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Select all in mini-ops' }));

    await waitFor(() => {
      const postCalls = (
        fetchMock.mock.calls as [string, { method?: string; body?: string }?][]
      ).filter(([u, init]) => u === '/api/skills/links' && init?.method === 'POST');

      // Should equip only mini-ops children: caddy-recovery and flowise
      expect(postCalls.length).toBe(2);

      const bodies = postCalls.map(([, init]) => JSON.parse(init?.body ?? '{}'));
      const paths = bodies.map((b: { relativePath: string }) => b.relativePath);
      expect(paths).toContain('mini-ops/caddy-recovery');
      expect(paths).toContain('mini-ops/flowise');
      // Should NOT include skills outside mini-ops
      expect(paths).not.toContain('coding');
      expect(paths).not.toContain('research/arxiv');
    });
  });

  it('disables bulk buttons during bulk action', async () => {
    const resolvers: (() => void)[] = [];
    const fetchMock = createFetchMock();
    const originalMock = fetchMock.getMockImplementation()!;

    fetchMock.mockImplementation(async (url: string, init?: { method?: string; body?: string }) => {
      if (url === '/api/skills/links' && init?.method === 'POST') {
        await new Promise<void>((resolve) => {
          resolvers.push(resolve);
        });
        return { ok: true, json: async () => ({ ok: true }) };
      }
      return originalMock(url, init);
    });

    global.fetch = fetchMock;

    render(<SkillsTabComponent name="alpha" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Select all skills' })).toBeInTheDocument();
    });

    // Start bulk action
    fireEvent.click(screen.getByRole('button', { name: 'Select all skills' }));

    // Buttons should be disabled during bulk action
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Select all skills' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Clear all skills' })).toBeDisabled();
    });

    // Resolve all pending POSTs
    for (const r of resolvers) r();

    // After bulk action completes, buttons should be enabled again
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Select all skills' })).not.toBeDisabled();
    });
  });

  it('per-skill checkbox remains functional after bulk controls are added', async () => {
    const fetchMock = createFetchMock({ equippedLinks: [] });
    global.fetch = fetchMock;

    render(<SkillsTabComponent name="alpha" />);

    await waitFor(() => {
      expect(screen.getByText('coding')).toBeInTheDocument();
    });

    // Find the coding checkbox and click it
    const codingLabel = screen.getByText('coding');
    const checkboxContainer = codingLabel.closest('div');
    const checkbox = checkboxContainer?.querySelector('button[role="checkbox"]');
    expect(checkbox).toBeTruthy();

    fireEvent.click(checkbox!);

    await waitFor(() => {
      const postCalls = (
        fetchMock.mock.calls as [string, { method?: string; body?: string }?][]
      ).filter(([u, init]) => u === '/api/skills/links' && init?.method === 'POST');

      const hasEquipCoding = postCalls.some(([, init]) => {
        const body = JSON.parse(init?.body ?? '{}');
        return body.relativePath === 'coding';
      });
      expect(hasEquipCoding).toBe(true);
    });
  });
});
