import fs from 'node:fs';
import path from 'node:path';

import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { db, schema } from '@/src/lib/db';
import { CreateLinkSchema, deriveRelativePath } from '@/src/lib/skills';

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

    // Derive relativePath from sourcePath (handles both canonical and legacy roots)
    const relativePath = deriveRelativePath(row.sourcePath) || path.basename(row.sourcePath);

    return { ...row, exists, relativePath };
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

  const { agent: agentName, relativePath } = parsed.data;

  const agent = await getAgent(agentName);
  if (!agent) {
    return NextResponse.json({ error: 'agent not found' }, { status: 404 });
  }

  // Resolve source and validate it's a skill directory
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const skillsRoot = path.join(home, '.agents', 'skills');
  const sourcePath = path.join(skillsRoot, relativePath);

  // Prevent directory traversal
  const normalized = path.normalize(sourcePath);
  const normalizedRoot = path.normalize(skillsRoot);
  if (!normalized.startsWith(normalizedRoot + path.sep) && normalized !== normalizedRoot) {
    return NextResponse.json(
      { error: 'invalid relative path: traversal detected' },
      { status: 400 },
    );
  }

  // Verify source exists and contains SKILL.md
  let stat: fs.Stats;
  try {
    stat = fs.statSync(sourcePath);
  } catch {
    return NextResponse.json({ error: 'source directory not found' }, { status: 400 });
  }

  if (!stat.isDirectory()) {
    return NextResponse.json({ error: 'source must be a directory' }, { status: 400 });
  }

  const hasSKILLMd = fs.existsSync(path.join(sourcePath, 'SKILL.md'));
  if (!hasSKILLMd) {
    return NextResponse.json(
      { error: 'source directory does not contain SKILL.md' },
      { status: 400 },
    );
  }

  // Build hierarchical target path
  const targetPath = path.join(agent.home, 'skills', relativePath);

  // Check for duplicate link
  const [existing] = await db
    .select()
    .from(schema.skillLinks)
    .where(
      and(eq(schema.skillLinks.agent, agentName), eq(schema.skillLinks.targetPath, targetPath)),
    );

  if (existing) {
    return NextResponse.json({ error: 'skill already equipped' }, { status: 409 });
  }

  // Check for conflicting existing target
  try {
    fs.lstatSync(targetPath);
    // If we reach here, target exists but isn't in DB - conflict
    return NextResponse.json({ error: 'target path already exists' }, { status: 409 });
  } catch {
    // Target doesn't exist yet - this is expected
  }

  // Create symlink with parent directories
  try {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.symlinkSync(sourcePath, targetPath);
  } catch (err: unknown) {
    const e = err as { code?: string; message: string };
    return NextResponse.json({ error: `Failed to create symlink: ${e.message}` }, { status: 500 });
  }

  // Insert DB record
  await db.insert(schema.skillLinks).values({ agent: agentName, sourcePath, targetPath });

  return NextResponse.json({ ok: true, targetPath, relativePath });
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

  // Remove the symlink
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

  // Prune empty parent directories up to the agent's skills root
  const agentSkillsRoot = path.dirname(row.targetPath.split('/').slice(0, -1).join('/'));
  let current = path.dirname(row.targetPath);

  while (current !== agentSkillsRoot && current !== '/' && current.length > 0) {
    try {
      const entries = fs.readdirSync(current);
      if (entries.length === 0) {
        fs.rmdirSync(current);
        current = path.dirname(current);
      } else {
        break;
      }
    } catch {
      // Stop trying to prune if we can't read or delete
      break;
    }
  }

  // Delete the DB record
  await db.delete(schema.skillLinks).where(eq(schema.skillLinks.id, id));

  return NextResponse.json({ ok: true });
}
