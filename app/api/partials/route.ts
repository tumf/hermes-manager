import path from 'node:path';

import { NextRequest, NextResponse } from 'next/server';

import {
  deletePartial,
  findAgentsUsingPartial,
  isValidPartialName,
  listPartialNames,
  readPartial,
  writePartial,
} from '@/src/lib/partials';
import { getRuntimeAgentsRootPath } from '@/src/lib/runtime-paths';
import { rebuildSoulForAgent } from '@/src/lib/soul-assembly';
import { partialNameSchema, upsertPartialSchema } from '@/src/lib/validators/partials';

async function listPartialsWithUsage() {
  const names = await listPartialNames();
  return Promise.all(
    names.map(async (name) => ({
      name,
      content: (await readPartial(name)) ?? '',
      usedBy: await findAgentsUsingPartial(name),
    })),
  );
}

async function rebuildAgentsUsingPartial(name: string): Promise<{ rebuiltAgents: string[] }> {
  const users = await findAgentsUsingPartial(name);
  const rebuiltAgents: string[] = [];

  for (const agentId of users) {
    const home = path.join(getRuntimeAgentsRootPath(), agentId);
    const rebuilt = await rebuildSoulForAgent(home);
    if (rebuilt) {
      rebuiltAgents.push(agentId);
    }
  }

  return { rebuiltAgents };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');

  if (!name) {
    const rows = await listPartialsWithUsage();
    return NextResponse.json(rows);
  }

  const parsed = partialNameSchema.safeParse(name);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const content = await readPartial(parsed.data);
  if (content === null) {
    return NextResponse.json({ error: 'partial not found' }, { status: 404 });
  }

  const usedBy = await findAgentsUsingPartial(parsed.data);
  return NextResponse.json({ name: parsed.data, content, usedBy });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = upsertPartialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { name, content } = parsed.data;
  if ((await readPartial(name)) !== null) {
    return NextResponse.json({ error: 'partial already exists' }, { status: 409 });
  }

  await writePartial(name, content);
  const { rebuiltAgents } = await rebuildAgentsUsingPartial(name);
  return NextResponse.json({ name, content, rebuiltAgents }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = upsertPartialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { name, content } = parsed.data;
  if ((await readPartial(name)) === null) {
    return NextResponse.json({ error: 'partial not found' }, { status: 404 });
  }

  await writePartial(name, content);
  const { rebuiltAgents } = await rebuildAgentsUsingPartial(name);
  return NextResponse.json({ name, content, rebuiltAgents });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name') ?? '';

  if (!isValidPartialName(name)) {
    return NextResponse.json({ error: 'invalid partial name' }, { status: 400 });
  }

  const existing = await readPartial(name);
  if (existing === null) {
    return NextResponse.json({ error: 'partial not found' }, { status: 404 });
  }

  const usedBy = await findAgentsUsingPartial(name);
  if (usedBy.length > 0) {
    return NextResponse.json({ error: 'partial is in use', usedBy }, { status: 409 });
  }

  const deleted = await deletePartial(name);
  if (!deleted) {
    return NextResponse.json({ error: 'partial not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
