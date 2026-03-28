import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { db, schema } from '@/src/lib/db';
import { getRuntimeAgentsRootPath } from '@/src/lib/runtime-paths';
import { CreateAgentSchema } from '@/src/lib/validators/agents';

export async function GET() {
  const rows = await db
    .select({
      id: schema.agents.id,
      name: schema.agents.name,
      home: schema.agents.home,
      label: schema.agents.label,
      enabled: schema.agents.enabled,
      createdAt: schema.agents.createdAt,
    })
    .from(schema.agents);
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const result = CreateAgentSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
  }

  const { name, templates: templateNames } = result.data;
  const home = getRuntimeAgentsRootPath(name);

  // Resolve template content for each file type
  const resolveTemplateContent = async (
    fileType: string,
    templateName: string | undefined,
    fallback: string,
  ): Promise<string> => {
    const nameToLookup = templateName ?? 'default';
    const rows = await db
      .select()
      .from(schema.templates)
      .where(
        and(eq(schema.templates.fileType, fileType), eq(schema.templates.name, nameToLookup)),
      );
    if (rows.length > 0) return rows[0].content;
    // If a specific template name was requested (not default) and not found, still fallback
    return fallback;
  };

  const agentsMdContent = await resolveTemplateContent(
    'agents.md',
    templateNames?.agentsMd,
    `# ${name}\n`,
  );
  const soulMdContent = await resolveTemplateContent(
    'soul.md',
    templateNames?.soulMd,
    `# Soul: ${name}\n`,
  );
  const configYamlContent = await resolveTemplateContent(
    'config.yaml',
    templateNames?.configYaml,
    `name: ${name}\n`,
  );

  await fs.mkdir(path.join(home, 'logs'), { recursive: true });
  await fs.writeFile(path.join(home, 'AGENTS.md'), agentsMdContent);
  await fs.writeFile(path.join(home, 'SOUL.md'), soulMdContent);
  await fs.writeFile(path.join(home, 'config.yaml'), configYamlContent);
  await fs.writeFile(path.join(home, '.env'), '');

  const label = `ai.hermes.gateway.${name}`;
  const [row] = await db.insert(schema.agents).values({ name, home, label }).returning();
  return NextResponse.json(row, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');
  const purge = searchParams.get('purge') === 'true';

  if (!name) {
    return NextResponse.json({ error: 'name query param required' }, { status: 400 });
  }

  const [agent] = await db.select().from(schema.agents).where(eq(schema.agents.name, name));
  if (!agent) {
    return NextResponse.json({ error: 'agent not found' }, { status: 404 });
  }

  // Best-effort stop launchd service
  const label = `ai.hermes.gateway.${name}`;
  const plistPath = path.join(
    process.env.HOME ?? '/tmp',
    'Library',
    'LaunchAgents',
    `${label}.plist`,
  );
  await new Promise<void>((resolve) => {
    execFile('launchctl', ['unload', plistPath], () => resolve());
  });

  await db.delete(schema.agents).where(eq(schema.agents.name, name));

  if (purge) {
    await fs.rm(agent.home, { recursive: true, force: true });
  }

  return NextResponse.json({ ok: true });
}
