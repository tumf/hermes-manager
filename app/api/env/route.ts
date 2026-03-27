import fs from 'node:fs/promises';
import path from 'node:path';

import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { db, schema } from '@/src/lib/db';
import { deleteKey, parse, serialize, upsert } from '@/src/lib/dotenv-parser';

const UpsertEnvSchema = z.object({
  agent: z.string().min(1),
  key: z.string().min(1),
  value: z.string(),
});

async function getAgent(name: string) {
  const [agent] = await db.select().from(schema.agents).where(eq(schema.agents.name, name));
  return agent ?? null;
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
  const reveal = searchParams.get('reveal') === 'true';

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

  const result = entries.map((e) => ({
    key: e.key,
    value: reveal ? e.value : '***',
    masked: !reveal,
  }));

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

  const { agent: agentName, key, value } = result.data;
  const agent = await getAgent(agentName);
  if (!agent) {
    return NextResponse.json({ error: 'agent not found' }, { status: 404 });
  }

  const envPath = path.join(agent.home, '.env');
  const content = await readEnvFile(envPath);
  const entries = await upsert(parse(content), key, value);
  await fs.writeFile(envPath, await serialize(entries), 'utf-8');

  return NextResponse.json({ ok: true });
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
  const entries = await deleteKey(parse(content), key);
  await fs.writeFile(envPath, await serialize(entries), 'utf-8');

  return NextResponse.json({ ok: true });
}
