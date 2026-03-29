import fs from 'node:fs';
import path from 'node:path';

import { NextRequest, NextResponse } from 'next/server';

import { getAgent } from '@/src/lib/agents';
import {
  createSkillLink,
  deleteSkillLink,
  listSkillLinks,
  skillLinkExists,
} from '@/src/lib/skill-links';
import { CreateLinkSchema } from '@/src/lib/skills';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agentName = searchParams.get('agent');

  if (!agentName) {
    return NextResponse.json({ error: 'agent query param required' }, { status: 400 });
  }

  const agent = await getAgent(agentName);
  if (!agent) {
    return NextResponse.json({ error: 'agent not found' }, { status: 404 });
  }

  const links = await listSkillLinks(agentName, agent.home);
  return NextResponse.json(links);
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

  // Check for duplicate link (symlink already exists at target)
  if (await skillLinkExists(targetPath)) {
    return NextResponse.json({ error: 'skill already equipped' }, { status: 409 });
  }

  // Create symlink with parent directories
  try {
    await createSkillLink(agent.home, sourcePath, relativePath);
  } catch (err: unknown) {
    const e = err as { message: string };
    return NextResponse.json({ error: `Failed to create symlink: ${e.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, targetPath, relativePath });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agentName = searchParams.get('agent');
  const relativePath = searchParams.get('path');

  if (!agentName) {
    return NextResponse.json({ error: 'agent query param required' }, { status: 400 });
  }
  if (!relativePath) {
    return NextResponse.json({ error: 'path query param required' }, { status: 400 });
  }

  const agent = await getAgent(agentName);
  if (!agent) {
    return NextResponse.json({ error: 'agent not found' }, { status: 404 });
  }

  const targetPath = path.join(agent.home, 'skills', relativePath);

  // Verify the symlink exists
  if (!(await skillLinkExists(targetPath))) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  try {
    await deleteSkillLink(agent.home, targetPath);
  } catch (err: unknown) {
    const e = err as { message: string };
    return NextResponse.json({ error: `Failed to remove symlink: ${e.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
