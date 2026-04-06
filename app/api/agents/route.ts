import { execFile } from 'node:child_process';
import path from 'node:path';

import { NextRequest, NextResponse } from 'next/server';

import {
  agentExists,
  allocateApiServerPort,
  createAgent,
  deleteAgent,
  getAgent,
  listAgents,
} from '@/src/lib/agents';
import { generateAgentId } from '@/src/lib/id';
import { resolveTemplateContent } from '@/src/lib/templates';
import { CreateAgentSchema } from '@/src/lib/validators/agents';

const MAX_ID_RETRIES = 5;

export async function GET() {
  const agents = await listAgents();
  const rows = agents.map((a) => ({
    agentId: a.agentId,
    home: a.home,
    label: a.label,
    enabled: a.enabled,
    createdAt: a.createdAt,
    name: a.name,
    description: a.description,
    tags: a.tags,
    memoryRssBytes: a.memoryRssBytes,
    hermesVersion: a.hermesVersion,
  }));
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  let templateNames:
    | { memoryMd?: string; userMd?: string; soulMd?: string; configYaml?: string }
    | undefined;
  let meta: { name?: string; description?: string; tags?: string[] } | undefined;
  if (request) {
    try {
      const body = await request.json();
      const result = CreateAgentSchema.safeParse(body);
      if (result.success) {
        if (result.data?.templates) {
          templateNames = result.data.templates;
        }
        if (result.data?.meta) {
          meta = result.data.meta;
        }
      }
    } catch {
      // No body or invalid JSON — that's fine, templates/meta are optional
    }
  }

  let agentId: string | null = null;
  for (let attempt = 0; attempt < MAX_ID_RETRIES; attempt++) {
    const candidate = generateAgentId();
    if (!(await agentExists(candidate))) {
      agentId = candidate;
      break;
    }
  }

  if (!agentId) {
    return NextResponse.json(
      { error: 'Failed to generate unique agent ID after retries' },
      { status: 500 },
    );
  }

  const memoryMdContent = resolveTemplateContent(
    'memories/MEMORY.md',
    agentId,
    templateNames?.memoryMd,
  );
  const userMdContent = resolveTemplateContent('memories/USER.md', agentId, templateNames?.userMd);
  const soulSrcMdContent = resolveTemplateContent('SOUL.md', agentId, templateNames?.soulMd);
  const configYamlContent = resolveTemplateContent(
    'config.yaml',
    agentId,
    templateNames?.configYaml,
  );

  let apiServerPort: number;
  try {
    apiServerPort = await allocateApiServerPort();
  } catch (error) {
    console.warn('[api/agents] failed to allocate api server port', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'No available API server ports in range 8642-8699' },
      { status: 409 },
    );
  }

  const agent = await createAgent(
    agentId,
    {
      memoryMd: memoryMdContent,
      userMd: userMdContent,
      soulSrcMd: soulSrcMdContent,
      configYaml: configYamlContent,
    },
    {
      name: meta?.name,
      description: meta?.description,
      tags: meta?.tags,
      apiServerPort,
    },
  );

  return NextResponse.json(agent, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get('id');
  const purge = searchParams.get('purge') === 'true';

  if (!agentId) {
    return NextResponse.json({ error: 'id query param required' }, { status: 400 });
  }

  const agent = await getAgent(agentId);
  if (!agent) {
    return NextResponse.json({ error: 'agent not found' }, { status: 404 });
  }

  const label = `ai.hermes.gateway.${agentId}`;
  const plistPath = path.join(
    process.env.HOME ?? '/tmp',
    'Library',
    'LaunchAgents',
    `${label}.plist`,
  );
  await new Promise<void>((resolve) => {
    execFile('launchctl', ['unload', plistPath], () => resolve());
  });

  if (purge) {
    await deleteAgent(agentId);
  }

  return NextResponse.json({ ok: true });
}
