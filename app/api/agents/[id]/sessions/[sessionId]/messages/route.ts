import path from 'node:path';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getAgent } from '@/src/lib/agents';
import { getRuntimeAgentsRootPath } from '@/src/lib/runtime-paths';
import { getMessages } from '@/src/lib/state-db';

const SessionIdSchema = z.string().regex(/^[a-zA-Z0-9_-]+$/);

interface RouteContext {
  params: Promise<{ id: string; sessionId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id, sessionId } = await context.params;
  const agentsRoot = path.resolve(getRuntimeAgentsRootPath());
  const candidateHome = path.resolve(agentsRoot, id);
  if (!candidateHome.startsWith(`${agentsRoot}${path.sep}`)) {
    return NextResponse.json({ error: 'invalid agent id' }, { status: 400 });
  }

  const parsedSessionId = SessionIdSchema.safeParse(sessionId);
  if (!parsedSessionId.success) {
    return NextResponse.json({ error: 'invalid session id' }, { status: 400 });
  }

  const agent = await getAgent(id);
  if (!agent) {
    return NextResponse.json({ error: 'agent not found' }, { status: 404 });
  }

  const messages = getMessages(agent.home, parsedSessionId.data);
  return NextResponse.json(messages);
}
