import path from 'node:path';

import { NextRequest, NextResponse } from 'next/server';

import { getAgent } from '@/src/lib/agents';
import {
  DispatchRequestSchema,
  readDelegationPolicy,
  validateDispatch,
} from '@/src/lib/delegation';
import { getRuntimeAgentsRootPath } from '@/src/lib/runtime-paths';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id: sourceId } = await context.params;

  const agentsRoot = path.resolve(getRuntimeAgentsRootPath());
  const candidateHome = path.resolve(agentsRoot, sourceId);
  if (!candidateHome.startsWith(`${agentsRoot}${path.sep}`)) {
    return NextResponse.json({ error: 'invalid agent id' }, { status: 400 });
  }

  const sourceAgent = await getAgent(sourceId);
  if (!sourceAgent) {
    return NextResponse.json({ error: 'source agent not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = DispatchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'invalid body' },
      { status: 400 },
    );
  }

  const dispatchReq = parsed.data;
  const sourceHome = getRuntimeAgentsRootPath(sourceId);
  const policy = await readDelegationPolicy(sourceHome);

  const validation = validateDispatch(sourceId, policy, dispatchReq);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 403 });
  }

  const targetAgent = await getAgent(dispatchReq.targetAgent);
  if (!targetAgent) {
    return NextResponse.json({ error: 'target agent not found' }, { status: 404 });
  }

  if (targetAgent.apiServerStatus !== 'connected' || !targetAgent.apiServerPort) {
    return NextResponse.json({ error: 'target agent api_server not available' }, { status: 503 });
  }

  const abortController = new AbortController();
  request.signal.addEventListener('abort', () => abortController.abort(), { once: true });

  const upstream = await fetch(
    `http://127.0.0.1:${targetAgent.apiServerPort}/v1/chat/completions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'hermes-agent',
        stream: true,
        messages: [{ role: 'user', content: dispatchReq.message }],
      }),
      signal: abortController.signal,
    },
  );

  if (!upstream.ok || !upstream.body) {
    const errorText = await upstream.text().catch(() => 'dispatch request failed');
    return NextResponse.json(
      { error: errorText || 'dispatch request failed' },
      { status: upstream.status || 502 },
    );
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
