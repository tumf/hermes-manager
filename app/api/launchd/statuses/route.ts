import { NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveAgentStatuses } from '@/src/lib/service-lifecycle';

const MAX_BATCH_AGENTS = 200;

const RequestSchema = z.object({
  agents: z.array(z.string().min(1)).min(1).max(MAX_BATCH_AGENTS),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const statuses = await resolveAgentStatuses(parsed.data.agents);
  return NextResponse.json({ statuses });
}
