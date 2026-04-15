import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  AgentConfigError,
  readAgentMcpConfigContent,
  writeAgentMcpConfigContent,
} from '@/src/lib/agent-config';
import { getAgent } from '@/src/lib/agents';

const MCP_DOCS_URL = 'https://hermes-agent.nousresearch.com/docs/guides/use-mcp-with-hermes';

const PutBodySchema = z.object({
  content: z.string(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const agent = await getAgent(id);
  if (!agent) {
    return NextResponse.json({ error: 'agent not found' }, { status: 404 });
  }

  const content = await readAgentMcpConfigContent(agent.home);
  return NextResponse.json({ content, docsUrl: MCP_DOCS_URL });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const agent = await getAgent(id);
  if (!agent) {
    return NextResponse.json({ error: 'agent not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parseResult = PutBodySchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error.errors[0].message }, { status: 400 });
  }

  try {
    await writeAgentMcpConfigContent(agent.home, parseResult.data.content);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AgentConfigError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
