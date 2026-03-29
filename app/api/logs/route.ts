import { NextRequest, NextResponse } from 'next/server';

import { getAgent } from '@/src/lib/agents';
import { LogQuerySchema, readLastNLines, resolveLogPath } from '@/src/lib/logs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const result = LogQuerySchema.safeParse({
    agent: searchParams.get('agent'),
    file: searchParams.get('file'),
    lines: searchParams.get('lines') ?? undefined,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
  }

  const { agent: agentName, file, lines } = result.data;

  const agent = await getAgent(agentName);
  if (!agent) {
    return NextResponse.json({ error: 'agent not found' }, { status: 404 });
  }

  const logPath = resolveLogPath(agent.home, file);
  const { lines: logLines, totalBytes } = await readLastNLines(logPath, lines);

  return NextResponse.json({ lines: logLines, totalBytes });
}
