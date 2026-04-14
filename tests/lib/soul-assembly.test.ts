// @vitest-environment node
import fs from 'node:fs/promises';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  assembleSoulSource,
  rebuildSoulForAgent,
  writeSoulSourceAndAssembled,
} from '../../src/lib/soul-assembly';

const mockState = vi.hoisted(() => ({
  partials: new Map<string, string>(),
}));

vi.mock('../../src/lib/partials', () => ({
  parsePartialReferences: (source: string) => {
    const pattern = /\{\{partial:([a-zA-Z0-9_-]+)\}\}/g;
    return [...source.matchAll(pattern)].map((match) => match[1] ?? '');
  },
  readPartial: vi.fn(async (name: string) => mockState.partials.get(name) ?? null),
}));

vi.mock('../../src/lib/delegation', () => ({
  readDelegationPolicy: vi.fn(async () => ({ allowedAgents: [], maxHop: 3 })),
  resolveTargetMeta: vi.fn(async () => []),
  buildSubagentSoulBlock: vi.fn(() => ''),
  injectSubagentSoulBlock: vi.fn((assembled: string) => assembled),
}));

vi.mock('node:fs/promises', () => ({
  default: {
    readFile: vi.fn(async (targetPath: string) => {
      if (targetPath.endsWith('SOUL.src.md')) {
        return '# Soul\n\n{{partial:shared-rules}}';
      }
      throw new Error('ENOENT');
    }),
    writeFile: vi.fn().mockResolvedValue(undefined),
    rename: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('soul-assembly', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.partials.clear();
    mockState.partials.set('shared-rules', '## Shared Rules');
  });

  it('expands partial references in source', async () => {
    const result = await assembleSoulSource('# Soul\n\n{{partial:shared-rules}}');
    expect(result).toContain('## Shared Rules');
  });

  it('throws SoulAssemblyError when partial is missing', async () => {
    await expect(assembleSoulSource('{{partial:missing}}')).rejects.toMatchObject({
      name: 'SoulAssemblyError',
      partialName: 'missing',
    });
  });

  it('throws SoulAssemblyError when nested partial exists', async () => {
    mockState.partials.set('shared-rules', '{{partial:nested}}');

    await expect(assembleSoulSource('{{partial:shared-rules}}')).rejects.toMatchObject({
      name: 'SoulAssemblyError',
      partialName: 'shared-rules',
    });
  });

  it('writes source and assembled files atomically', async () => {
    await writeSoulSourceAndAssembled(
      '/runtime/agents/alpha',
      '# Soul\n\n{{partial:shared-rules}}',
    );

    expect(vi.mocked(fs.writeFile)).toHaveBeenCalledWith(
      '/runtime/agents/alpha/SOUL.src.md.tmp',
      '# Soul\n\n{{partial:shared-rules}}',
      'utf-8',
    );
    expect(vi.mocked(fs.writeFile)).toHaveBeenCalledWith(
      '/runtime/agents/alpha/SOUL.md.tmp',
      '# Soul\n\n## Shared Rules',
      'utf-8',
    );
    expect(vi.mocked(fs.rename)).toHaveBeenCalledWith(
      '/runtime/agents/alpha/SOUL.src.md.tmp',
      '/runtime/agents/alpha/SOUL.src.md',
    );
    expect(vi.mocked(fs.rename)).toHaveBeenCalledWith(
      '/runtime/agents/alpha/SOUL.md.tmp',
      '/runtime/agents/alpha/SOUL.md',
    );
  });

  it('rebuilds SOUL.md from SOUL.src.md when source exists', async () => {
    const rebuilt = await rebuildSoulForAgent('/runtime/agents/alpha');
    expect(rebuilt).toBe(true);
  });

  it('returns false when SOUL.src.md is absent', async () => {
    vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('ENOENT'));

    const rebuilt = await rebuildSoulForAgent('/runtime/agents/beta');
    expect(rebuilt).toBe(false);
  });
});
