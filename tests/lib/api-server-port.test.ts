import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fsSync.mkdtempSync(path.join(os.tmpdir(), 'api-port-allocation-test-'));
  vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('allocateApiServerPort', () => {
  it('returns minimum available port in 8642-8699', async () => {
    await fs.mkdir(path.join(tmpDir, 'runtime', 'agents', 'a1'), { recursive: true });
    await fs.mkdir(path.join(tmpDir, 'runtime', 'agents', 'a2'), { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, 'runtime', 'agents', 'a1', 'meta.json'),
      JSON.stringify({ name: 'A1', description: '', tags: [], apiServerPort: 8642 }),
      'utf-8',
    );
    await fs.writeFile(
      path.join(tmpDir, 'runtime', 'agents', 'a2', 'meta.json'),
      JSON.stringify({ name: 'A2', description: '', tags: [], apiServerPort: 8644 }),
      'utf-8',
    );

    const { allocateApiServerPort } = await import('../../src/lib/agents');
    const allocated = await allocateApiServerPort();

    expect(allocated).toBe(8643);
  });

  it('throws when all ports in range are exhausted', async () => {
    for (let port = 8642; port <= 8699; port += 1) {
      const agentId = `agent-${port}`;
      const agentDir = path.join(tmpDir, 'runtime', 'agents', agentId);
      await fs.mkdir(agentDir, { recursive: true });
      await fs.writeFile(
        path.join(agentDir, 'meta.json'),
        JSON.stringify({ name: agentId, description: '', tags: [], apiServerPort: port }),
        'utf-8',
      );
    }

    const { allocateApiServerPort } = await import('../../src/lib/agents');
    await expect(allocateApiServerPort()).rejects.toThrow('No available API server ports');
  });
});
