import path from 'node:path';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getAgent } from '@/src/lib/agents';
import { getRuntimeAgentsRootPath } from '@/src/lib/runtime-paths';
import { searchSessionMessages } from '@/src/lib/state-db';

const QuerySchema = z.object({
  q: z.string().min(2),
  source: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
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

  const parsed = QuerySchema.safeParse({
    q: request.nextUrl.searchParams.get('q') ?? undefined,
    source: request.nextUrl.searchParams.get('source') ?? undefined,
    limit: request.nextUrl.searchParams.get('limit') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'invalid query' },
      { status: 400 },
    );
  }

  const results = searchSessionMessages(agent.home, parsed.data.q, {
    source: parsed.data.source,
    limit: parsed.data.limit,
  });
  return NextResponse.json(results);
}
