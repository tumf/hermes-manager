import fs from 'node:fs/promises';
import path from 'node:path';

import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { db, schema } from '@/src/lib/db';
import { CopyAgentSchema } from '@/src/lib/validators/agents';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const result = CopyAgentSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
  }

  const { from, to } = result.data;

  const [sourceAgent] = await db.select().from(schema.agents).where(eq(schema.agents.name, from));
  if (!sourceAgent) {
    return NextResponse.json({ error: 'source agent not found' }, { status: 404 });
  }

  const toHome = path.join(process.cwd(), 'agents', to);
  await fs.cp(sourceAgent.home, toHome, { recursive: true });

  const label = `ai.hermes.gateway.${to}`;
  const [row] = await db
    .insert(schema.agents)
    .values({ name: to, home: toHome, label })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
