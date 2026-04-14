import path from 'node:path';

import { NextRequest, NextResponse } from 'next/server';

import { agentExists, listAgents } from '@/src/lib/agents';
import {
  DelegationPolicySchema,
  detectCycle,
  loadAllDelegationEdges,
  readDelegationPolicy,
  validateNoSelfTarget,
  writeDelegationPolicy,
} from '@/src/lib/delegation';
import { syncDelegationForAgent } from '@/src/lib/delegation-sync';
import { getRuntimeAgentsRootPath } from '@/src/lib/runtime-paths';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const agentsRoot = path.resolve(getRuntimeAgentsRootPath());
  const candidateHome = path.resolve(agentsRoot, id);
  if (!candidateHome.startsWith(`${agentsRoot}${path.sep}`)) {
    return NextResponse.json({ error: 'invalid agent id' }, { status: 400 });
  }

  if (!(await agentExists(id))) {
    return NextResponse.json({ error: 'agent not found' }, { status: 404 });
  }

  const agentHome = getRuntimeAgentsRootPath(id);
  const policy = await readDelegationPolicy(agentHome);
  const agents = await listAgents();
  const availableAgents = agents
    .filter((a) => a.agentId !== id)
    .map((a) => ({ id: a.agentId, name: a.name, description: a.description, tags: a.tags }));

  return NextResponse.json({
    policy,
    availableAgents,
  });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const agentsRoot = path.resolve(getRuntimeAgentsRootPath());
  const candidateHome = path.resolve(agentsRoot, id);
  if (!candidateHome.startsWith(`${agentsRoot}${path.sep}`)) {
    return NextResponse.json({ error: 'invalid agent id' }, { status: 400 });
  }

  if (!(await agentExists(id))) {
    return NextResponse.json({ error: 'agent not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = DelegationPolicySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'invalid body' },
      { status: 400 },
    );
  }

  const policy = parsed.data;

  if (!validateNoSelfTarget(id, policy.allowedAgents)) {
    return NextResponse.json({ error: 'agent cannot delegate to itself' }, { status: 400 });
  }

  for (const targetId of policy.allowedAgents) {
    if (!(await agentExists(targetId))) {
      return NextResponse.json(
        { error: `target agent "${targetId}" does not exist` },
        { status: 400 },
      );
    }
  }

  const edges = await loadAllDelegationEdges();
  if (detectCycle(edges, id, policy.allowedAgents)) {
    return NextResponse.json({ error: 'delegation policy would create a cycle' }, { status: 409 });
  }

  const agentHome = getRuntimeAgentsRootPath(id);
  await writeDelegationPolicy(agentHome, policy);
  await syncDelegationForAgent(id, agentHome, policy);

  return NextResponse.json({ policy });
}
