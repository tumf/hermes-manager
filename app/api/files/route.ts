import fs from 'node:fs/promises';
import path from 'node:path';

import * as yaml from 'js-yaml';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getAgent } from '@/src/lib/agents';
import { SoulAssemblyError, writeSoulSourceAndAssembled } from '@/src/lib/soul-assembly';
import { stripZeroWidthSpace } from '@/src/lib/text-sanitizer';

const AllowedPathEnum = z.enum([
  'SOUL.md',
  'SOUL.src.md',
  'memories/MEMORY.md',
  'memories/USER.md',
  'config.yaml',
]);

const GetQuerySchema = z.object({
  agent: z.string().min(1),
  path: AllowedPathEnum,
});

const PutBodySchema = z.object({
  agent: z.string().min(1),
  path: AllowedPathEnum,
  content: z.string(),
});

function guardTraversal(agentHome: string, requestedPath: string): string | null {
  const resolved = path.resolve(agentHome, requestedPath);
  if (!resolved.startsWith(agentHome + path.sep) && resolved !== agentHome) {
    return null;
  }
  return resolved;
}

async function hasSoulSource(agentHome: string): Promise<boolean> {
  try {
    await fs.access(path.join(agentHome, 'SOUL.src.md'));
    return true;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parseResult = GetQuerySchema.safeParse({
    agent: searchParams.get('agent') ?? '',
    path: searchParams.get('path') ?? '',
  });

  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error.errors[0].message }, { status: 400 });
  }

  const { agent: agentName, path: filePath } = parseResult.data;

  const agent = await getAgent(agentName);
  if (!agent) {
    return NextResponse.json({ error: 'agent not found' }, { status: 404 });
  }

  const resolved = guardTraversal(agent.home, filePath);
  if (!resolved) {
    return NextResponse.json({ error: 'path traversal detected' }, { status: 400 });
  }

  try {
    const content = await fs.readFile(resolved, 'utf-8');
    return NextResponse.json({ content });
  } catch {
    return NextResponse.json({ error: 'file not found' }, { status: 404 });
  }
}

export async function PUT(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parseResult = PutBodySchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error.errors[0].message }, { status: 400 });
  }

  const { agent: agentName, path: filePath } = parseResult.data;
  const content = stripZeroWidthSpace(parseResult.data.content);

  const agent = await getAgent(agentName);
  if (!agent) {
    return NextResponse.json({ error: 'agent not found' }, { status: 404 });
  }

  const resolved = guardTraversal(agent.home, filePath);
  if (!resolved) {
    return NextResponse.json({ error: 'path traversal detected' }, { status: 400 });
  }

  if (filePath === 'config.yaml') {
    try {
      yaml.load(content);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'invalid YAML';
      return NextResponse.json({ error: `Invalid YAML: ${message}` }, { status: 422 });
    }
  }

  if (filePath === 'SOUL.md') {
    if (await hasSoulSource(agent.home)) {
      return NextResponse.json(
        { error: 'SOUL.md cannot be edited directly when SOUL.src.md exists' },
        { status: 409 },
      );
    }
  }

  if (filePath === 'SOUL.src.md') {
    try {
      await writeSoulSourceAndAssembled(agent.home, content);
      return NextResponse.json({ ok: true });
    } catch (error) {
      if (error instanceof SoulAssemblyError) {
        return NextResponse.json(
          { error: `Unknown partial reference: ${error.partialName}` },
          { status: 422 },
        );
      }
      throw error;
    }
  }

  const tmpPath = `${resolved}.tmp`;
  await fs.writeFile(tmpPath, content, 'utf-8');
  await fs.rename(tmpPath, resolved);

  return NextResponse.json({ ok: true });
}
