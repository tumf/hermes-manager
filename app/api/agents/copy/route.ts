import fs from 'node:fs/promises';

import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { db, schema } from '@/src/lib/db';
import { generateAgentId } from '@/src/lib/id';
import { getRuntimeAgentsRootPath } from '@/src/lib/runtime-paths';
import { CopyAgentSchema } from '@/src/lib/validators/agents';

const MAX_ID_RETRIES = 5;

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

  const { from } = result.data;

  const [sourceAgent] = await db
    .select()
    .from(schema.agents)
    .where(eq(schema.agents.agentId, from));
  if (!sourceAgent) {
    return NextResponse.json({ error: 'source agent not found' }, { status: 404 });
  }

  // Auto-generate a unique agent ID
  let newAgentId: string | null = null;
  for (let attempt = 0; attempt < MAX_ID_RETRIES; attempt++) {
    const candidate = generateAgentId();
    const [existing] = await db
      .select({ id: schema.agents.id })
      .from(schema.agents)
      .where(eq(schema.agents.agentId, candidate));
    if (!existing) {
      newAgentId = candidate;
      break;
    }
  }

  if (!newAgentId) {
    return NextResponse.json(
      { error: 'Failed to generate unique agent ID after retries' },
      { status: 500 },
    );
  }

  const toHome = getRuntimeAgentsRootPath(newAgentId);
  await fs.cp(sourceAgent.home, toHome, { recursive: true });

  const label = `ai.hermes.gateway.${newAgentId}`;
  const [row] = await db
    .insert(schema.agents)
    .values({ agentId: newAgentId, home: toHome, label })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
