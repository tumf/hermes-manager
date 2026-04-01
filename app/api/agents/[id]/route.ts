import path from 'node:path';

import { NextResponse } from 'next/server';

import { getAgent } from '@/src/lib/agents';
import { getRuntimeAgentsRootPath } from '@/src/lib/runtime-paths';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const agentsRoot = path.resolve(getRuntimeAgentsRootPath());
  const candidateHome = path.resolve(agentsRoot, id);
  if (!candidateHome.startsWith(`${agentsRoot}${path.sep}`)) {
    return NextResponse.json({ error: 'invalid agent id' }, { status: 400 });
  }

  const agent = await getAgent(id);
  if (!agent) {
    return NextResponse.json({ error: 'agent not found' }, { status: 404 });
  }

  return NextResponse.json(agent);
}
