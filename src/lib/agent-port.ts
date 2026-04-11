import fsp from 'node:fs/promises';
import path from 'node:path';

import {
  API_SERVER_PORT_MAX,
  API_SERVER_PORT_MIN,
  isApiServerPortInRange,
  parseEnvApiServerPort,
  readMetaJson,
} from './agent-fs';
import { getRuntimeAgentsRootPath } from './runtime-paths';

export async function allocateApiServerPort(): Promise<number> {
  const agentsRoot = getRuntimeAgentsRootPath();
  let entries: string[];
  try {
    entries = await fsp.readdir(agentsRoot);
  } catch {
    entries = [];
  }

  const usedPorts = new Set<number>();
  for (const entry of entries) {
    const agentHome = path.join(agentsRoot, entry);
    const stat = await fsp.stat(agentHome).catch(() => null);
    if (!stat?.isDirectory()) {
      continue;
    }

    const meta = readMetaJson(agentHome);
    if (isApiServerPortInRange(meta.apiServerPort)) {
      usedPorts.add(meta.apiServerPort);
    }

    try {
      const envPath = path.join(agentHome, '.env');
      const envContent = await fsp.readFile(envPath, 'utf-8');
      const envPort = parseEnvApiServerPort(envContent);
      if (envPort !== null) {
        usedPorts.add(envPort);
      }
    } catch {
      // .env might not exist — that's fine
    }
  }

  for (let candidate = API_SERVER_PORT_MIN; candidate <= API_SERVER_PORT_MAX; candidate += 1) {
    if (!usedPorts.has(candidate)) {
      console.info('[agents] allocated api server port', {
        candidate,
        usedPortsCount: usedPorts.size,
      });
      return candidate;
    }
  }

  const error = new Error('No available API server ports in range 8642-8699');
  console.error('[agents] api server port allocation failed', {
    min: API_SERVER_PORT_MIN,
    max: API_SERVER_PORT_MAX,
    usedPortsCount: usedPorts.size,
  });
  throw error;
}
