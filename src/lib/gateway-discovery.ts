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

function readDotenv(filePath: string): Record<string, string> {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const result: Record<string, string> = {};
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex < 1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      result[key] = value;
    }
    return result;
  } catch {
    return {};
  }
}

export function isApiServerEnabled(agentHome: string): boolean {
  // Check config.yaml platforms list
  const config = readYamlObject(path.join(agentHome, 'config.yaml'));
  const platforms = getPlatforms(config);

  if (Array.isArray(platforms)) {
    if (platforms.some((p) => p === 'api_server' || p === 'platforms/api_server')) {
      return true;
    }
  }

  if (typeof platforms === 'object' && platforms !== null) {
    const record = platforms as Record<string, unknown>;
    if ('api_server' in record) {
      const value = record.api_server;
      if (typeof value === 'boolean') return value;
      return true;
    }
  }

  // Also check .env for API_SERVER_ENABLED or API_SERVER_KEY (matches hermes gateway behavior)
  // Globals .env is merged first, then agent-local .env overrides
  const globalsEnvPath = path.resolve(agentHome, '..', '..', 'globals', '.env');
  const globalEnv = readDotenv(globalsEnvPath);
  const localEnv = readDotenv(path.join(agentHome, '.env'));
  const env = { ...globalEnv, ...localEnv };
  if (['true', '1', 'yes'].includes((env.API_SERVER_ENABLED ?? '').toLowerCase())) {
    return true;
  }
  if (env.API_SERVER_KEY) {
    return true;
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
