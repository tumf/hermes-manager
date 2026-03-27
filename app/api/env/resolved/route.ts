import fs from 'node:fs/promises';
import path from 'node:path';

import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { db, schema } from '@/src/lib/db';
import { parse } from '@/src/lib/dotenv-parser';

type EnvSource = 'global' | 'agent' | 'agent-override';

interface ResolvedEntry {
  key: string;
  value: string;
  source: EnvSource;
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

  const [agent] = await db.select().from(schema.agents).where(eq(schema.agents.name, agentName));
  if (!agent) {
    return NextResponse.json({ error: 'agent not found' }, { status: 404 });
  }

  const hermesHome = process.env.HERMES_HOME ?? process.cwd();
  const globalEnvPath = path.join(hermesHome, '.env');
  const agentEnvPath = path.join(agent.home, '.env');

  const [globalContent, agentContent] = await Promise.all([
    readEnvFile(globalEnvPath),
    readEnvFile(agentEnvPath),
  ]);

  const globalEntries = parse(globalContent);
  const agentEntries = parse(agentContent);

  const globalMap = new Map(globalEntries.map((e) => [e.key, e.value]));

  const result: ResolvedEntry[] = [];
  const seen = new Set<string>();

  // Agent entries take precedence
  for (const { key, value } of agentEntries) {
    seen.add(key);
    const source: EnvSource = globalMap.has(key) ? 'agent-override' : 'agent';
    result.push({ key, value, source });
  }

  // Global-only entries
  for (const { key, value } of globalEntries) {
    if (!seen.has(key)) {
      result.push({ key, value, source: 'global' });
    }
  }

  return NextResponse.json(result);
}
