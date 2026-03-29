import fs from 'node:fs/promises';

import { NextRequest, NextResponse } from 'next/server';

import { agentExists, getAgent } from '@/src/lib/agents';
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

  const sourceAgent = await getAgent(from);
  if (!sourceAgent) {
    return NextResponse.json({ error: 'source agent not found' }, { status: 404 });
  }

  // Auto-generate a unique agent ID
  let newAgentId: string | null = null;
  for (let attempt = 0; attempt < MAX_ID_RETRIES; attempt++) {
    const candidate = generateAgentId();
    if (!(await agentExists(candidate))) {
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

  // Re-read the newly created agent from filesystem
  const newAgent = await getAgent(newAgentId);
  return NextResponse.json(newAgent, { status: 201 });
}
