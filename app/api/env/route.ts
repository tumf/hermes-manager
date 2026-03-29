import fs from 'node:fs/promises';
import path from 'node:path';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getAgent } from '@/src/lib/agents';
import { deleteKey, parse, serialize, upsert } from '@/src/lib/dotenv-parser';
import { readEnvMeta, removeVisibility, setVisibility } from '@/src/lib/env-meta';

const MASKED_VALUE = '***';
const visibilitySchema = z.enum(['plain', 'secure']);

const UpsertEnvSchema = z.object({
  agent: z.string().min(1),
  key: z.string().min(1),
  value: z.string().optional(),
  visibility: visibilitySchema.default('plain'),
});

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

  const envPath = path.join(agent.home, '.env');
  const content = await readEnvFile(envPath);
  const entries = parse(content);

  const meta = await readEnvMeta(agent.home);
  const visibilityMap = new Map(
    Object.entries(meta).map(([key, val]) => [
      key,
      val.visibility === 'secure' ? 'secure' : 'plain',
    ]),
  );

  const result = entries.map((entry) => {
    const visibility = visibilityMap.get(entry.key) ?? 'plain';
    const masked = visibility === 'secure';
    return {
      key: entry.key,
      value: masked ? MASKED_VALUE : entry.value,
      masked,
      visibility,
    };
  });

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const result = UpsertEnvSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
  }

  const { agent: agentName, key, value, visibility } = result.data;
  const safeVisibility = visibility === 'secure' ? 'secure' : 'plain';

  const agent = await getAgent(agentName);
  if (!agent) {
    return NextResponse.json({ error: 'agent not found' }, { status: 404 });
  }

  const envPath = path.join(agent.home, '.env');
  const content = await readEnvFile(envPath);
  const parsedEntries = parse(content);
  const existingEntry = parsedEntries.find((entry) => entry.key === key);

  const nextValue = value ?? existingEntry?.value;
  if (nextValue === undefined) {
    return NextResponse.json({ error: 'value is required for new key' }, { status: 400 });
  }

  const entries = upsert(parsedEntries, key, nextValue);
  await fs.writeFile(envPath, serialize(entries), 'utf-8');

  // Update visibility metadata in .env.meta.json
  await setVisibility(agent.home, key, safeVisibility);

  return NextResponse.json({ ok: true, visibility: safeVisibility });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agentName = searchParams.get('agent');
  const key = searchParams.get('key');

  if (!agentName) {
    return NextResponse.json({ error: 'agent query param required' }, { status: 400 });
  }
  if (!key) {
    return NextResponse.json({ error: 'key query param required' }, { status: 400 });
  }

  const agent = await getAgent(agentName);
  if (!agent) {
    return NextResponse.json({ error: 'agent not found' }, { status: 404 });
  }

  const envPath = path.join(agent.home, '.env');
  const content = await readEnvFile(envPath);
  const entries = deleteKey(parse(content), key);
  await fs.writeFile(envPath, serialize(entries), 'utf-8');

  // Remove visibility metadata
  await removeVisibility(agent.home, key);

  return NextResponse.json({ ok: true });
}
