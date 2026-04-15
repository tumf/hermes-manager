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

function parseValidPort(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 65535) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    // Strip surrounding quotes and literal \n that dotenvx may inject
<<<<<<< Updated upstream
    const cleaned = value
      .trim()
      .replace(/^["']|["']$/g, '')
      .replace(/\\n/g, '')
      .trim();
=======
    const cleaned = value.trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '').trim();
>>>>>>> Stashed changes
    const port = Number(cleaned);
    if (Number.isInteger(port) && port > 0 && port <= 65535) {
      return port;
    }
  }

  return null;
}

function readMetaJsonPort(agentHome: string): number | null {
  const metaPath = path.join(agentHome, 'meta.json');
  try {
    const raw = fs.readFileSync(metaPath, 'utf-8');
    const parsed = JSON.parse(raw) as { apiServerPort?: unknown };
    return parseValidPort(parsed.apiServerPort);
  } catch {
    return null;
  }
}

function readApiServerPort(agentHome: string, statePort: unknown): number | null {
  const stateResolved = parseValidPort(statePort);
  if (stateResolved !== null) {
    return stateResolved;
  }

  return readMetaJsonPort(agentHome);
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

  const platformState = state.platforms?.api_server?.state ?? 'unknown';
  if (platformState !== 'connected') {
    // 'disconnected' is a permanent failure — classify as error, not starting
    const isTransient = platformState === 'connecting' || platformState === 'starting';
    return {
      status: isTransient ? 'starting' : 'error',
      port: null,
      reason: `api_server platform state is ${platformState}`,
    };
  }

  const port = readApiServerPort(agentHome, state.api_server_port);
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
