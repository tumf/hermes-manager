import fs from 'node:fs';
import path from 'node:path';

import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { db, schema } from '@/src/lib/db';
import { CreateLinkSchema } from '@/src/lib/skills';

async function getAgent(name: string) {
  const [agent] = await db.select().from(schema.agents).where(eq(schema.agents.name, name));
  return agent ?? null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agentName = searchParams.get('agent');

  if (!agentName) {
    return NextResponse.json({ error: 'agent query param required' }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(schema.skillLinks)
    .where(eq(schema.skillLinks.agent, agentName));

  const result = rows.map((row) => {
    let exists = false;
    try {
      fs.lstatSync(row.targetPath);
      exists = true;
    } catch {
      exists = false;
    }
    return { ...row, exists };
  });

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = CreateLinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { agent: agentName, sourcePath } = parsed.data;

  const agent = await getAgent(agentName);
  if (!agent) {
    return NextResponse.json({ error: 'agent not found' }, { status: 404 });
  }

  // If sourcePath is a file, link the parent directory instead
  let linkSource = sourcePath;
  try {
    const stat = fs.statSync(sourcePath);
    if (!stat.isDirectory()) {
      linkSource = path.dirname(sourcePath);
    }
  } catch {
    // sourcePath doesn't exist; proceed as-is
  }

  const targetPath = path.join(agent.home, 'skills', path.basename(linkSource));

  // Check for duplicate
  const [existing] = await db
    .select()
    .from(schema.skillLinks)
    .where(
      and(eq(schema.skillLinks.agent, agentName), eq(schema.skillLinks.sourcePath, sourcePath)),
    );

  if (existing) {
    return NextResponse.json({ error: 'link already exists' }, { status: 409 });
  }

  // Create symlink
  try {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.symlinkSync(linkSource, targetPath);
  } catch (err: unknown) {
    const e = err as { code?: string; message: string };
    if (e.code !== 'EEXIST') {
      return NextResponse.json(
        { error: `Failed to create symlink: ${e.message}` },
        { status: 500 },
      );
    }
  }

  await db.insert(schema.skillLinks).values({ agent: agentName, sourcePath, targetPath });

  return NextResponse.json({ ok: true, targetPath });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const idParam = searchParams.get('id');

  if (!idParam) {
    return NextResponse.json({ error: 'id query param required' }, { status: 400 });
  }

  const id = parseInt(idParam, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'id must be a number' }, { status: 400 });
  }

  const [row] = await db.select().from(schema.skillLinks).where(eq(schema.skillLinks.id, id));

  if (!row) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  try {
    fs.unlinkSync(row.targetPath);
  } catch (err: unknown) {
    const e = err as { code?: string; message: string };
    if (e.code !== 'ENOENT') {
      return NextResponse.json(
        { error: `Failed to remove symlink: ${e.message}` },
        { status: 500 },
      );
    }
  }

  await db.delete(schema.skillLinks).where(eq(schema.skillLinks.id, id));

  return NextResponse.json({ ok: true });
}
