import fs from 'node:fs';
import path from 'node:path';

import * as yaml from 'js-yaml';

type PlatformState = {
  state?: string;
};

type GatewayState = {
  pid?: number;
  gateway_state?: string;
  api_server_port?: number;
  platforms?: Record<string, PlatformState>;
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

export async function discoverApiServerPort(agentHome: string): Promise<number | null> {
  if (!isApiServerEnabled(agentHome)) {
    return null;
  }

  const state = readGatewayState(agentHome);
  if (!state || state.gateway_state !== 'running' || typeof state.pid !== 'number') {
    return null;
  }

  // Check if api_server platform is actually connected in gateway state
  if (state.platforms?.api_server?.state !== 'connected') {
    return null;
  }

  if (typeof state.api_server_port === 'number') {
    return state.api_server_port;
  }

  // Fall back to .env API_SERVER_PORT or hermes default (8642)
  const DEFAULT_API_SERVER_PORT = 8642;
  const globalsEnvPath = path.resolve(agentHome, '..', '..', 'globals', '.env');
  const globalEnv = readDotenv(globalsEnvPath);
  const localEnv = readDotenv(path.join(agentHome, '.env'));
  const env = { ...globalEnv, ...localEnv };
  const portStr = env.API_SERVER_PORT;
  const port = portStr ? Number(portStr) : DEFAULT_API_SERVER_PORT;
  if (Number.isInteger(port) && port > 0 && port <= 65535) {
    return port;
  }

  return null;
}
