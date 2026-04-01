import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

import * as yaml from 'js-yaml';

const execFileAsync = promisify(execFile);

type GatewayState = {
  pid?: number;
  gateway_state?: string;
  api_server_port?: number;
};

function readYamlObject(filePath: string): Record<string, unknown> {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = yaml.load(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function readGatewayState(agentHome: string): GatewayState | null {
  const statePath = path.join(agentHome, 'gateway_state.json');
  try {
    const raw = fs.readFileSync(statePath, 'utf-8');
    const parsed = JSON.parse(raw) as GatewayState;
    return parsed;
  } catch {
    return null;
  }
}

function getPlatforms(config: Record<string, unknown>): unknown {
  return config.platforms;
}

export function isApiServerEnabled(agentHome: string): boolean {
  const config = readYamlObject(path.join(agentHome, 'config.yaml'));
  const platforms = getPlatforms(config);

  if (Array.isArray(platforms)) {
    return platforms.some((p) => p === 'api_server' || p === 'platforms/api_server');
  }

  if (typeof platforms === 'object' && platforms !== null) {
    const record = platforms as Record<string, unknown>;
    if ('api_server' in record) {
      const value = record.api_server;
      if (typeof value === 'boolean') return value;
      return true;
    }
  }

  return false;
}

function extractPortFromLsof(stdout: string): number | null {
  const lines = stdout.split('\n');
  for (const line of lines) {
    const match = line.match(/:(\d+)\s*\(LISTEN\)/);
    if (!match) continue;
    const port = Number(match[1]);
    if (Number.isInteger(port) && port > 0 && port <= 65535) {
      return port;
    }
  }
  return null;
}

export async function discoverApiServerPort(agentHome: string): Promise<number | null> {
  if (!isApiServerEnabled(agentHome)) {
    return null;
  }

  const state = readGatewayState(agentHome);
  if (!state || state.gateway_state !== 'running' || typeof state.pid !== 'number') {
    return null;
  }

  if (typeof state.api_server_port === 'number') {
    return state.api_server_port;
  }

  try {
    const { stdout } = await execFileAsync('lsof', [
      '-nP',
      '-p',
      String(state.pid),
      '-iTCP',
      '-sTCP:LISTEN',
    ]);

    return extractPortFromLsof(stdout);
  } catch {
    return null;
  }
}
