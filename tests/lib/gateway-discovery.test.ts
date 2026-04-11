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

  it('returns starting when gateway running and api_server is still connecting', async () => {
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
    expect(result.reason).toContain('connecting');
    expect(result.port).toBeNull();
  });

  it('returns error when gateway running but api_server is disconnected', async () => {
    const agentHome = path.join(tmpDir, 'agent-disconnected');
    await fsp.mkdir(agentHome, { recursive: true });
    await fsp.writeFile(path.join(agentHome, 'config.yaml'), 'platforms:\n  - api_server\n');
    await fsp.writeFile(
      path.join(agentHome, 'gateway_state.json'),
      JSON.stringify({
        pid: 9999,
        gateway_state: 'running',
        platforms: { api_server: { state: 'disconnected' } },
      }),
    );

    const result = discoverApiServerStatus(agentHome);
    expect(result.status).toBe('error');
    expect(result.reason).toContain('disconnected');
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

  it('falls back to meta.json apiServerPort when state has no port', async () => {
    const agentHome = path.join(tmpDir, 'agent-meta-port');
    await fsp.mkdir(agentHome, { recursive: true });
    await fsp.writeFile(path.join(agentHome, 'config.yaml'), 'platforms:\n  - api_server\n');
    await fsp.writeFile(path.join(agentHome, 'meta.json'), JSON.stringify({ apiServerPort: 8645 }));
    await fsp.writeFile(
      path.join(agentHome, 'gateway_state.json'),
      JSON.stringify({
        pid: 9999,
        gateway_state: 'running',
        platforms: { api_server: { state: 'connected' } },
      }),
    );

    expect(discoverApiServerStatus(agentHome)).toEqual({ status: 'connected', port: 8645 });
  });

  it('does not fall back to .env API_SERVER_PORT (only state/meta are used)', async () => {
    const runtimeDir = path.join(tmpDir, 'runtime');
    const agentHome = path.join(runtimeDir, 'agents', 'agent-env-port');
    const globalsDir = path.join(runtimeDir, 'globals');
    await fsp.mkdir(agentHome, { recursive: true });
    await fsp.mkdir(globalsDir, { recursive: true });
    await fsp.writeFile(path.join(agentHome, 'config.yaml'), 'platforms:\n  - api_server\n');
    await fsp.writeFile(path.join(globalsDir, '.env'), 'API_SERVER_PORT=19007\n');
    await fsp.writeFile(
      path.join(agentHome, 'gateway_state.json'),
      JSON.stringify({
        pid: 9999,
        gateway_state: 'running',
        api_server_port: 'broken',
        platforms: { api_server: { state: 'connected' } },
      }),
    );

    // .env port is ignored — no valid state/meta port means error
    const result = discoverApiServerStatus(agentHome);
    expect(result.status).toBe('error');
    expect(result.port).toBeNull();
  });

  it('returns error when connected but no valid port exists in state/meta', async () => {
    const agentHome = path.join(tmpDir, 'agent-error');
    await fsp.mkdir(agentHome, { recursive: true });
    await fsp.writeFile(path.join(agentHome, 'config.yaml'), 'platforms:\n  - api_server\n');
    await fsp.writeFile(
      path.join(agentHome, 'meta.json'),
      JSON.stringify({ apiServerPort: 'bad' }),
    );
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
