import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getAgent } from '@/src/lib/agents';
import {
  ensureAgentApiServerPort,
  executeServiceAction,
  type ServiceAction,
} from '@/src/lib/service-lifecycle';

const RequestSchema = z.object({
  agent: z.string(),
  action: z.enum(['install', 'uninstall', 'start', 'stop', 'restart', 'status']),
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

  const { agent: agentName, action } = parsed.data;

  const agentRow = await getAgent(agentName);
  if (!agentRow) {
    return NextResponse.json({ error: `Agent "${agentName}" not found` }, { status: 404 });
  }

  const needsPort = action === 'install' || action === 'start' || action === 'restart';
  const apiServerPort = needsPort
    ? await ensureAgentApiServerPort(agentName)
    : agentRow.apiServerPort;

  if (needsPort && apiServerPort === null) {
    return NextResponse.json(
      { error: 'Failed to resolve api server port for agent' },
      { status: 500 },
    );
  }

  const result = await executeServiceAction({
    agentName,
    home: agentRow.home,
    label: agentRow.label,
    apiServerPort,
    action: action as ServiceAction,
  });

  if (result.action === 'install' || result.action === 'uninstall') {
    return NextResponse.json({
      stdout: result.stdout,
      stderr: result.stderr,
      code: result.code,
      manager: result.manager,
    });
  }

  if (result.action === 'status') {
    return NextResponse.json({
      running: result.running,
      pid: result.pid,
      output: result.output,
      stdout: result.stdout,
      stderr: result.stderr,
      code: result.code,
      manager: result.manager,
    });
  }

  // start, stop, restart (result is LifecycleResult at this point)
  if (result.action !== 'start' && result.action !== 'stop' && result.action !== 'restart') {
    return NextResponse.json({ error: 'Unexpected action' }, { status: 500 });
  }

  const payload = {
    stdout: result.stdout,
    stderr: result.stderr,
    code: result.code,
    running: result.running,
    pid: result.pid,
    timedOut: result.timedOut,
    manager: result.manager,
  };

  if (result.failed) {
    return NextResponse.json(payload, { status: 500 });
  }

  return NextResponse.json(payload);
}
