// @vitest-environment node
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const execFileMock = vi.hoisted(() => vi.fn());

vi.mock('node:child_process', () => ({
  execFile: execFileMock,
}));

describe('gateway discovery', () => {
  let tmpDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gateway-discovery-'));
  });

  it('returns false when api_server is not configured', async () => {
    const agentHome = path.join(tmpDir, 'agent-a');
    await fsp.mkdir(agentHome, { recursive: true });
    await fsp.writeFile(path.join(agentHome, 'config.yaml'), 'name: test\n');

    const { isApiServerEnabled } = await import('../../src/lib/gateway-discovery');
    expect(isApiServerEnabled(agentHome)).toBe(false);
  });

  it('returns api_server_port from gateway state when present', async () => {
    const agentHome = path.join(tmpDir, 'agent-b');
    await fsp.mkdir(agentHome, { recursive: true });
    await fsp.writeFile(path.join(agentHome, 'config.yaml'), 'platforms:\n  - api_server\n');
    await fsp.writeFile(
      path.join(agentHome, 'gateway_state.json'),
      JSON.stringify({ pid: 9999, gateway_state: 'running', api_server_port: 18477 }),
    );

    const { discoverApiServerPort } = await import('../../src/lib/gateway-discovery');
    await expect(discoverApiServerPort(agentHome)).resolves.toBe(18477);
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it('returns true when API_SERVER_ENABLED is set in .env', async () => {
    const agentHome = path.join(tmpDir, 'agent-env');
    await fsp.mkdir(agentHome, { recursive: true });
    await fsp.writeFile(path.join(agentHome, 'config.yaml'), 'name: test\n');
    await fsp.writeFile(path.join(agentHome, '.env'), 'API_SERVER_ENABLED=true\n');

    const { isApiServerEnabled } = await import('../../src/lib/gateway-discovery');
    expect(isApiServerEnabled(agentHome)).toBe(true);
  });

  it('returns true when API_SERVER_KEY is set in .env', async () => {
    const agentHome = path.join(tmpDir, 'agent-key');
    await fsp.mkdir(agentHome, { recursive: true });
    await fsp.writeFile(path.join(agentHome, 'config.yaml'), 'name: test\n');
    await fsp.writeFile(path.join(agentHome, '.env'), 'API_SERVER_KEY=my-secret\n');

    const { isApiServerEnabled } = await import('../../src/lib/gateway-discovery');
    expect(isApiServerEnabled(agentHome)).toBe(true);
  });

  it('returns null when gateway is not running', async () => {
    const agentHome = path.join(tmpDir, 'agent-c');
    await fsp.mkdir(agentHome, { recursive: true });
    await fsp.writeFile(path.join(agentHome, 'config.yaml'), 'platforms:\n  - api_server\n');
    await fsp.writeFile(
      path.join(agentHome, 'gateway_state.json'),
      JSON.stringify({ pid: 9999, gateway_state: 'stopped' }),
    );

    const { discoverApiServerPort } = await import('../../src/lib/gateway-discovery');
    await expect(discoverApiServerPort(agentHome)).resolves.toBeNull();
  });
});
