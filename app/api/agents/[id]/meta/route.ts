import { NextRequest, NextResponse } from 'next/server';

import { updateAgentMeta } from '@/src/lib/agents';
import { UpdateAgentMetaSchema } from '@/src/lib/validators/agents';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const result = UpdateAgentMetaSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.errors[0]?.message ?? 'Invalid body' },
      { status: 400 },
    );
  }

  const meta = {
    name: result.data.name ?? '',
    description: result.data.description ?? '',
    tags: result.data.tags ?? [],
  };

  const updated = await updateAgentMeta(id, meta);
  if (!updated) {
    return NextResponse.json({ error: 'agent not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}
