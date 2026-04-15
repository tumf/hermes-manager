import { NextRequest, NextResponse } from 'next/server';

import { getAgent } from '@/src/lib/agents';
import { getMcpDocsUrl, readMcpConfig, writeMcpConfig } from '@/src/lib/mcp-config';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const agent = await getAgent(id);
  if (!agent) {
    return NextResponse.json({ error: 'agent not found' }, { status: 404 });
  }

  const content = await readMcpConfig(agent.home);
  return NextResponse.json({ content, docsUrl: getMcpDocsUrl() });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null || typeof (body as Record<string, unknown>).content !== 'string') {
    return NextResponse.json({ error: 'body must contain a "content" string' }, { status: 400 });
  }

  const agent = await getAgent(id);
  if (!agent) {
    return NextResponse.json({ error: 'agent not found' }, { status: 404 });
  }

  const { error } = await writeMcpConfig(agent.home, (body as Record<string, unknown>).content as string);
  if (error) {
    return NextResponse.json({ error }, { status: 422 });
  }

  return NextResponse.json({ ok: true });
}
