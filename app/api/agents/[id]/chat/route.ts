import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getAgent } from '@/src/lib/agents';

const ChatBodySchema = z.object({
  message: z.string().min(1).max(4096),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = ChatBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'invalid body' },
      { status: 400 },
    );
  }

  const agent = await getAgent(id);
  if (!agent) {
    return NextResponse.json({ error: 'agent not found' }, { status: 404 });
  }

  if (!agent.apiServerAvailable || !agent.apiServerPort) {
    return NextResponse.json({ error: 'api_server not available' }, { status: 503 });
  }

  const abortController = new AbortController();
  request.signal.addEventListener('abort', () => abortController.abort(), { once: true });

  const upstream = await fetch(`http://127.0.0.1:${agent.apiServerPort}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'hermes-agent',
      stream: true,
      messages: [{ role: 'user', content: parsed.data.message }],
    }),
    signal: abortController.signal,
  });

  if (!upstream.ok || !upstream.body) {
    const errorText = await upstream.text().catch(() => 'gateway request failed');
    return NextResponse.json(
      { error: errorText || 'gateway request failed' },
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
