// @vitest-environment node
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  discoverApiServerPort,
  discoverApiServerStatus,
  isApiServerEnabled,
} from '../../src/lib/gateway-discovery';

describe('gateway discovery', () => {
  let tmpDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gateway-discovery-'));
  });

  it('returns disabled when api_server is not configured', async () => {
    const agentHome = path.join(tmpDir, 'agent-a');
    await fsp.mkdir(agentHome, { recursive: true });
    await fsp.writeFile(path.join(agentHome, 'config.yaml'), 'name: test\n');

    expect(discoverApiServerStatus(agentHome)).toEqual({ status: 'disabled', port: null });
  });

  it('returns configured-needs-restart when enabled but gateway is not running', async () => {
    const agentHome = path.join(tmpDir, 'agent-restart');
    await fsp.mkdir(agentHome, { recursive: true });
    await fsp.writeFile(path.join(agentHome, 'config.yaml'), 'platforms:\n  - api_server\n');
    await fsp.writeFile(
      path.join(agentHome, 'gateway_state.json'),
      JSON.stringify({ pid: 9999, gateway_state: 'stopped' }),
    );

    const result = discoverApiServerStatus(agentHome);
    expect(result.status).toBe('configured-needs-restart');
    expect(result.port).toBeNull();
  });

  it('returns starting when gateway running but platform not connected', async () => {
    const agentHome = path.join(tmpDir, 'agent-starting');
    await fsp.mkdir(agentHome, { recursive: true });
    await fsp.writeFile(path.join(agentHome, 'config.yaml'), 'platforms:\n  - api_server\n');
    await fsp.writeFile(
      path.join(agentHome, 'gateway_state.json'),
      JSON.stringify({
        pid: 9999,
        gateway_state: 'running',
        platforms: { api_server: { state: 'connecting' } },
      }),
    );

    const result = discoverApiServerStatus(agentHome);
    expect(result.status).toBe('starting');
    expect(result.port).toBeNull();
  });

  it('returns connected and api_server_port from gateway state when present', async () => {
    const agentHome = path.join(tmpDir, 'agent-b');
    await fsp.mkdir(agentHome, { recursive: true });
    await fsp.writeFile(path.join(agentHome, 'config.yaml'), 'platforms:\n  - api_server\n');
    await fsp.writeFile(
      path.join(agentHome, 'gateway_state.json'),
      JSON.stringify({
        pid: 9999,
        gateway_state: 'running',
        api_server_port: 18477,
        platforms: { api_server: { state: 'connected' } },
      }),
    );

    const status = discoverApiServerStatus(agentHome);
    expect(status).toEqual({ status: 'connected', port: 18477 });
    await expect(discoverApiServerPort(agentHome)).resolves.toBe(18477);
  });

  it('returns connected with default port when connected but no explicit port', async () => {
    const agentHome = path.join(tmpDir, 'agent-default-port');
    await fsp.mkdir(agentHome, { recursive: true });
    await fsp.writeFile(path.join(agentHome, 'config.yaml'), 'platforms:\n  - api_server\n');
    await fsp.writeFile(
      path.join(agentHome, 'gateway_state.json'),
      JSON.stringify({
        pid: 9999,
        gateway_state: 'running',
        platforms: { api_server: { state: 'connected' } },
      }),
    );

    expect(discoverApiServerStatus(agentHome)).toEqual({ status: 'connected', port: 8642 });
  });

  it('returns error when connected but port is invalid', async () => {
    const runtimeDir = path.join(tmpDir, 'runtime');
    const agentHome = path.join(runtimeDir, 'agents', 'agent-error');
    const globalsDir = path.join(runtimeDir, 'globals');
    await fsp.mkdir(agentHome, { recursive: true });
    await fsp.mkdir(globalsDir, { recursive: true });
    await fsp.writeFile(path.join(agentHome, 'config.yaml'), 'platforms:\n  - api_server\n');
    await fsp.writeFile(path.join(globalsDir, '.env'), 'API_SERVER_PORT=invalid\n');
    await fsp.writeFile(
      path.join(agentHome, 'gateway_state.json'),
      JSON.stringify({
        pid: 9999,
        gateway_state: 'running',
        api_server_port: 'broken',
        platforms: { api_server: { state: 'connected' } },
      }),
    );

    const result = discoverApiServerStatus(agentHome);
    expect(result.status).toBe('error');
    expect(result.port).toBeNull();
  });

  it('returns true when API_SERVER_ENABLED is set in .env', async () => {
    const agentHome = path.join(tmpDir, 'agent-env');
    await fsp.mkdir(agentHome, { recursive: true });
    await fsp.writeFile(path.join(agentHome, 'config.yaml'), 'name: test\n');
    await fsp.writeFile(path.join(agentHome, '.env'), 'API_SERVER_ENABLED=true\n');

    expect(isApiServerEnabled(agentHome)).toBe(true);
  });

  it('returns true when API_SERVER_ENABLED is set in globals .env', async () => {
    // Simulate runtime/agents/agent-id and runtime/globals/.env structure
    const runtimeDir = path.join(tmpDir, 'runtime');
    const agentHome = path.join(runtimeDir, 'agents', 'agent-global');
    const globalsDir = path.join(runtimeDir, 'globals');
    await fsp.mkdir(agentHome, { recursive: true });
    await fsp.mkdir(globalsDir, { recursive: true });
    await fsp.writeFile(path.join(agentHome, 'config.yaml'), 'name: test\n');
    await fsp.writeFile(path.join(globalsDir, '.env'), 'API_SERVER_ENABLED=true\n');

    expect(isApiServerEnabled(agentHome)).toBe(true);
  });

  it('returns true when API_SERVER_KEY is set in .env', async () => {
    const agentHome = path.join(tmpDir, 'agent-key');
    await fsp.mkdir(agentHome, { recursive: true });
    await fsp.writeFile(path.join(agentHome, 'config.yaml'), 'name: test\n');
    await fsp.writeFile(path.join(agentHome, '.env'), 'API_SERVER_KEY=my-secret\n');

    expect(isApiServerEnabled(agentHome)).toBe(true);
  });
});
