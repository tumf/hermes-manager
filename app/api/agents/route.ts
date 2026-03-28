import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { db, schema } from '@/src/lib/db';
import { generateAgentId } from '@/src/lib/id';
import { getRuntimeAgentsRootPath } from '@/src/lib/runtime-paths';

const MAX_ID_RETRIES = 5;

export async function GET() {
  const rows = await db
    .select({
      id: schema.agents.id,
      agentId: schema.agents.agentId,
      home: schema.agents.home,
      label: schema.agents.label,
      enabled: schema.agents.enabled,
      createdAt: schema.agents.createdAt,
    })
    .from(schema.agents);
  return NextResponse.json(rows);
}

export async function POST() {
  // Auto-generate a unique agent ID with collision retry
  let agentId: string | null = null;
  for (let attempt = 0; attempt < MAX_ID_RETRIES; attempt++) {
    const candidate = generateAgentId();
    const [existing] = await db
      .select({ id: schema.agents.id })
      .from(schema.agents)
      .where(eq(schema.agents.agentId, candidate));
    if (!existing) {
      agentId = candidate;
      break;
    }
  }

  if (!agentId) {
    return NextResponse.json(
      { error: 'Failed to generate unique agent ID after retries' },
      { status: 500 },
    );
  }

  const home = getRuntimeAgentsRootPath(agentId);

  await fs.mkdir(path.join(home, 'logs'), { recursive: true });
  await fs.writeFile(path.join(home, 'AGENTS.md'), `# ${agentId}\n`);
  await fs.writeFile(path.join(home, 'SOUL.md'), `# Soul: ${agentId}\n`);
  await fs.writeFile(path.join(home, 'config.yaml'), `name: ${agentId}\n`);
  await fs.writeFile(path.join(home, '.env'), '');

  const label = `ai.hermes.gateway.${agentId}`;
  const [row] = await db
    .insert(schema.agents)
    .values({ agentId, home, label })
    .returning();
  return NextResponse.json(row, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get('id');
  const purge = searchParams.get('purge') === 'true';

  if (!agentId) {
    return NextResponse.json({ error: 'id query param required' }, { status: 400 });
  }

  const [agent] = await db
    .select()
    .from(schema.agents)
    .where(eq(schema.agents.agentId, agentId));
  if (!agent) {
    return NextResponse.json({ error: 'agent not found' }, { status: 404 });
  }

  // Best-effort stop launchd service
  const label = `ai.hermes.gateway.${agentId}`;
  const plistPath = path.join(
    process.env.HOME ?? '/tmp',
    'Library',
    'LaunchAgents',
    `${label}.plist`,
  );
  await new Promise<void>((resolve) => {
    execFile('launchctl', ['unload', plistPath], () => resolve());
  });

  await db.delete(schema.agents).where(eq(schema.agents.agentId, agentId));

  if (purge) {
    await fs.rm(agent.home, { recursive: true, force: true });
  }

  return NextResponse.json({ ok: true });
}
