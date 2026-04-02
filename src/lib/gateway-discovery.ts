import fs from 'node:fs';
import path from 'node:path';

import * as yaml from 'js-yaml';

type PlatformState = {
  state?: string;
};

type GatewayState = {
  pid?: number;
  gateway_state?: string;
  api_server_port?: unknown;
  platforms?: Record<string, PlatformState>;
};

export type ApiServerStatus =
  | 'disabled'
  | 'configured-needs-restart'
  | 'starting'
  | 'connected'
  | 'error';

export interface ApiServerDiscovery {
  status: ApiServerStatus;
  port: number | null;
  reason?: string;
}

const DEFAULT_API_SERVER_PORT = 8642;

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

function isApiServerConfigured(agentHome: string): boolean {
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

export function isApiServerEnabled(agentHome: string): boolean {
  return isApiServerConfigured(agentHome);
}

function readApiServerPortFromStateOrEnv(
  statePort: unknown,
  env: Record<string, string>,
): number | null {
  if (typeof statePort === 'number') {
    if (Number.isInteger(statePort) && statePort > 0 && statePort <= 65535) {
      return statePort;
    }
    return null;
  }

  if (typeof env.API_SERVER_PORT === 'string') {
    const port = Number(env.API_SERVER_PORT);
    if (Number.isInteger(port) && port > 0 && port <= 65535) {
      return port;
    }
    return null;
  }

  return DEFAULT_API_SERVER_PORT;
}

export function discoverApiServerStatus(agentHome: string): ApiServerDiscovery {
  if (!isApiServerConfigured(agentHome)) {
    return { status: 'disabled', port: null };
  }

  const state = readGatewayState(agentHome);
  if (!state || typeof state.pid !== 'number' || state.gateway_state !== 'running') {
    return {
      status: 'configured-needs-restart',
      port: null,
      reason: !state
        ? 'gateway state is missing or not parseable'
        : 'gateway is not running or not reflected yet',
    };
  }

  if (state.platforms?.api_server?.state !== 'connected') {
    return {
      status: 'starting',
      port: null,
      reason: `api_server platform state is ${state.platforms?.api_server?.state ?? 'unknown'}`,
    };
  }

  const globalsEnvPath = path.resolve(agentHome, '..', '..', 'globals', '.env');
  const globalEnv = readDotenv(globalsEnvPath);
  const localEnv = readDotenv(path.join(agentHome, '.env'));
  const env = { ...globalEnv, ...localEnv };
  const port = readApiServerPortFromStateOrEnv(state.api_server_port, env);
  if (typeof port === 'number') {
    return { status: 'connected', port };
  }

  return {
    status: 'error',
    port: null,
    reason: 'gateway is connected but api_server port is invalid',
  };
}

export async function discoverApiServerPort(agentHome: string): Promise<number | null> {
  const result = discoverApiServerStatus(agentHome);
  return result.port;
}
