import fs from 'node:fs/promises';
import path from 'node:path';

import * as yaml from 'js-yaml';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getAgent } from '@/src/lib/agents';

const AllowedPathEnum = z.enum(['MEMORY.md', 'USER.md', 'SOUL.md', 'config.yaml']);

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

  const content = await fs.readFile(resolved, 'utf-8');
  return NextResponse.json({ content });
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

  const { agent: agentName, path: filePath, content } = parseResult.data;

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

  const tmpPath = resolved + '.tmp';
  await fs.writeFile(tmpPath, content, 'utf-8');
  await fs.rename(tmpPath, resolved);

  return NextResponse.json({ ok: true });
}
