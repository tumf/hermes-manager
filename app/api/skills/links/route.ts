import path from 'node:path';

import { NextRequest, NextResponse } from 'next/server';

import { getAgent } from '@/src/lib/agents';
import {
  createSkillLink,
  deleteSkillLink,
  listSkillLinks,
  skillLinkExists,
} from '@/src/lib/skill-links';
import { CreateLinkSchema, resolveSkillSource } from '@/src/lib/skills';

function isWithinRoot(root: string, candidate: string): boolean {
  const resolvedRoot = path.resolve(root);
  const resolvedCandidate = path.resolve(candidate);
  return (
    resolvedCandidate === resolvedRoot || resolvedCandidate.startsWith(`${resolvedRoot}${path.sep}`)
  );
}

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

  const { sourcePath, isValid, hasSKILLMd } = resolveSkillSource(relativePath);
  if (!isValid) {
    return NextResponse.json({ error: 'source directory not found' }, { status: 400 });
  }
  if (!hasSKILLMd) {
    return NextResponse.json(
      { error: 'source directory does not contain SKILL.md' },
      { status: 400 },
    );
  }

  const skillsRoot = path.join(agent.home, 'skills');
  const targetPath = path.join(skillsRoot, relativePath);
  if (!isWithinRoot(skillsRoot, targetPath)) {
    return NextResponse.json(
      { error: 'invalid relative path: traversal detected' },
      { status: 400 },
    );
  }

  if (await skillLinkExists(targetPath)) {
    return NextResponse.json({ error: 'skill already equipped' }, { status: 409 });
  }

  try {
    await createSkillLink(agent.home, sourcePath, relativePath);
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e.code === 'EEXIST') {
      return NextResponse.json({ error: 'skill already equipped' }, { status: 409 });
    }
    return NextResponse.json(
      { error: `Failed to copy skill directory: ${e.message ?? 'unknown error'}` },
      { status: 500 },
    );
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

  const skillsRoot = path.join(agent.home, 'skills');
  const targetPath = path.join(skillsRoot, relativePath);
  if (!isWithinRoot(skillsRoot, targetPath)) {
    return NextResponse.json(
      { error: 'invalid relative path: traversal detected' },
      { status: 400 },
    );
  }

  if (!(await skillLinkExists(targetPath))) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  try {
    await deleteSkillLink(agent.home, targetPath);
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json(
      { error: `Failed to remove copied skill: ${e.message ?? 'unknown error'}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
