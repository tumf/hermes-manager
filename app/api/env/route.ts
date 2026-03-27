import fs from 'node:fs/promises';
import path from 'node:path';

import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { db, schema } from '@/src/lib/db';
import { deleteKey, parse, serialize, upsert } from '@/src/lib/dotenv-parser';

const MASKED_VALUE = '***';
const visibilitySchema = z.enum(['plain', 'secure']);

const UpsertEnvSchema = z.object({
  agent: z.string().min(1),
  key: z.string().min(1),
  value: z.string(),
  visibility: visibilitySchema.default('plain'),
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

  const metadata = await db
    .select()
    .from(schema.envVars)
    .where(eq(schema.envVars.scope, agentName));
  const visibilityMap = new Map(
    metadata.map((item) => [item.key, item.visibility === 'secure' ? 'secure' : 'plain']),
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
  const entries = await upsert(parse(content), key, value);
  await fs.writeFile(envPath, await serialize(entries), 'utf-8');

  const existingMetadata = await db
    .select()
    .from(schema.envVars)
    .where(and(eq(schema.envVars.scope, agentName), eq(schema.envVars.key, key)));

  if (existingMetadata.length > 0) {
    await db
      .update(schema.envVars)
      .set({ visibility: safeVisibility, value })
      .where(and(eq(schema.envVars.scope, agentName), eq(schema.envVars.key, key)));
  } else {
    await db.insert(schema.envVars).values({
      scope: agentName,
      key,
      value,
      visibility: safeVisibility,
    });
  }

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
  const entries = await deleteKey(parse(content), key);
  await fs.writeFile(envPath, await serialize(entries), 'utf-8');

  await db
    .delete(schema.envVars)
    .where(and(eq(schema.envVars.scope, agentName), eq(schema.envVars.key, key)));

  return NextResponse.json({ ok: true });
}
