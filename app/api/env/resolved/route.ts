import fs from 'node:fs/promises';
import path from 'node:path';

import { NextRequest, NextResponse } from 'next/server';

import { getAgent } from '@/src/lib/agents';
import { parse } from '@/src/lib/dotenv-parser';
import { readEnvMeta } from '@/src/lib/env-meta';
import { getRuntimeGlobalsRootPath } from '@/src/lib/runtime-paths';

type EnvSource = 'global' | 'agent' | 'agent-override';

interface ResolvedEntry {
  key: string;
  value: string;
  source: EnvSource;
  visibility: 'plain' | 'secure';
}

async function readEnvFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return '';
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agentName = searchParams.get('agent');

  if (!agentName) {
    return NextResponse.json({ error: 'agent query param required' }, { status: 400 });
  }

  const agent = await getAgent(agentName);
  if (!agent) {
    return NextResponse.json({ error: 'agent not found' }, { status: 404 });
  }

  const globalEnvPath = getRuntimeGlobalsRootPath('.env');
  const agentEnvPath = path.join(agent.home, '.env');
  const globalsDir = getRuntimeGlobalsRootPath();

  const [globalContent, agentContent, globalMeta, agentMeta] = await Promise.all([
    readEnvFile(globalEnvPath),
    readEnvFile(agentEnvPath),
    readEnvMeta(globalsDir),
    readEnvMeta(agent.home),
  ]);

  const globalEntries = parse(globalContent);
  const agentEntries = parse(agentContent);

  const globalMap = new Map(globalEntries.map((e) => [e.key, e.value]));

  const visibilityMap = new Map<string, 'plain' | 'secure'>();
  for (const [key, val] of Object.entries(globalMeta)) {
    visibilityMap.set(key, val.visibility === 'secure' ? 'secure' : 'plain');
  }
  for (const [key, val] of Object.entries(agentMeta)) {
    visibilityMap.set(key, val.visibility === 'secure' ? 'secure' : 'plain');
  }

  const result: ResolvedEntry[] = [];
  const seen = new Set<string>();

  // Agent entries take precedence
  for (const { key, value } of agentEntries) {
    seen.add(key);
    const source: EnvSource = globalMap.has(key) ? 'agent-override' : 'agent';
    result.push({ key, value, source, visibility: visibilityMap.get(key) ?? 'plain' });
  }

  // Global-only entries
  for (const { key, value } of globalEntries) {
    if (!seen.has(key)) {
      result.push({ key, value, source: 'global', visibility: visibilityMap.get(key) ?? 'plain' });
    }
  }

  return NextResponse.json(result);
}
