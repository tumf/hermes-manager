import { execFile } from 'node:child_process';
import path from 'node:path';

import { NextRequest, NextResponse } from 'next/server';

import { agentExists, createAgent, deleteAgent, getAgent, listAgents } from '@/src/lib/agents';
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
  }));
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  // Parse optional body for template selection
  let templateNames: { agentsMd?: string; soulMd?: string; configYaml?: string } | undefined;
  if (request) {
    try {
      const body = await request.json();
      const result = CreateAgentSchema.safeParse(body);
      if (result.success && result.data?.templates) {
        templateNames = result.data.templates;
      }
    } catch {
      // No body or invalid JSON — that's fine, templates are optional
    }
  }

  // Auto-generate a unique agent ID with collision retry
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

  // Resolve template content from filesystem
  const agentsMdContent = resolveTemplateContent('AGENTS.md', agentId, templateNames?.agentsMd);
  const soulMdContent = resolveTemplateContent('SOUL.md', agentId, templateNames?.soulMd);
  const configYamlContent = resolveTemplateContent(
    'config.yaml',
    agentId,
    templateNames?.configYaml,
  );

  const agent = await createAgent(agentId, {
    agentsMd: agentsMdContent,
    soulMd: soulMdContent,
    configYaml: configYamlContent,
  });

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

  // Best-effort stop launchd service
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
