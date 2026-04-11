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

  it('considers legacy .env port assignments as used', async () => {
    await fs.mkdir(path.join(tmpDir, 'runtime', 'agents', 'legacy'), { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, 'runtime', 'agents', 'legacy', '.env'),
      'API_SERVER_PORT=8642\n',
      'utf-8',
    );

    const { allocateApiServerPort } = await import('../../src/lib/agents');
    const allocated = await allocateApiServerPort();

    expect(allocated).toBe(8643);
  });

  it('considers both meta.json and .env ports as used', async () => {
    await fs.mkdir(path.join(tmpDir, 'runtime', 'agents', 'meta-agent'), { recursive: true });
    await fs.mkdir(path.join(tmpDir, 'runtime', 'agents', 'env-agent'), { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, 'runtime', 'agents', 'meta-agent', 'meta.json'),
      JSON.stringify({ name: 'M', description: '', tags: [], apiServerPort: 8642 }),
      'utf-8',
    );
    await fs.writeFile(
      path.join(tmpDir, 'runtime', 'agents', 'env-agent', '.env'),
      'API_SERVER_PORT=8643\n',
      'utf-8',
    );

    const { allocateApiServerPort } = await import('../../src/lib/agents');
    const allocated = await allocateApiServerPort();

    expect(allocated).toBe(8644);
  });

  it('returns 8642 when no agents directory exists', async () => {
    const { allocateApiServerPort } = await import('../../src/lib/agents');
    const allocated = await allocateApiServerPort();

    expect(allocated).toBe(8642);
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
