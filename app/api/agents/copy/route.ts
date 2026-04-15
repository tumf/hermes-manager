import fs from 'node:fs/promises';
import path from 'node:path';

import { NextRequest, NextResponse } from 'next/server';

import { agentExists, allocateApiServerPort, getAgent } from '@/src/lib/agents';
import { PLATFORM_TOKEN_KEYS } from '@/src/lib/constants';
import { clearTokenValues } from '@/src/lib/dotenv-parser';
import { generateAgentId } from '@/src/lib/id';
import { getRuntimeAgentsRootPath } from '@/src/lib/runtime-paths';
import { CopyAgentSchema } from '@/src/lib/validators/agents';

const MAX_ID_RETRIES = 5;

async function updateCopiedMetaNameAndPort(toHome: string, apiServerPort: number): Promise<void> {
  const metaPath = path.join(toHome, 'meta.json');
  try {
    const content = await fs.readFile(metaPath, 'utf-8');
    const parsed = JSON.parse(content) as {
      name?: unknown;
      description?: unknown;
      tags?: unknown;
    };

    const baseName = typeof parsed.name === 'string' ? parsed.name.trim() : '';
    const copiedName = baseName
      ? baseName.endsWith(' (Copy)')
        ? baseName
        : `${baseName} (Copy)`
      : '';
    const normalized = {
      name: copiedName,
      description: typeof parsed.description === 'string' ? parsed.description : '',
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.filter((tag): tag is string => typeof tag === 'string')
        : [],
      apiServerPort,
    };

    await fs.writeFile(metaPath, JSON.stringify(normalized, null, 2), 'utf-8');
  } catch {
    await fs.writeFile(
      metaPath,
      JSON.stringify(
        {
          name: '',
          description: '',
          tags: [],
          apiServerPort,
        },
        null,
        2,
      ),
      'utf-8',
    );
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const result = CopyAgentSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
  }

  const { from } = result.data;

  const sourceAgent = await getAgent(from);
  if (!sourceAgent) {
    return NextResponse.json({ error: 'source agent not found' }, { status: 404 });
  }

  let newAgentId: string | null = null;
  for (let attempt = 0; attempt < MAX_ID_RETRIES; attempt++) {
    const candidate = generateAgentId();
    if (!(await agentExists(candidate))) {
      newAgentId = candidate;
      break;
    }
  }

  if (!newAgentId) {
    return NextResponse.json(
      { error: 'Failed to generate unique agent ID after retries' },
      { status: 500 },
    );
  }

  let apiServerPort: number;
  try {
    apiServerPort = await allocateApiServerPort();
  } catch {
    return NextResponse.json(
      { error: 'No available API server ports in range 8642-8699' },
      { status: 409 },
    );
  }

  const toHome = getRuntimeAgentsRootPath(newAgentId);
  await fs.cp(sourceAgent.home, toHome, {
    recursive: true,
    filter: (src) => {
      const rel = path.relative(sourceAgent.home, src);
      return rel !== 'logs' && !rel.startsWith('logs/') && !rel.startsWith('logs\\');
    },
  });

  const copiedEnvPath = `${toHome}/.env`;
  await clearTokenValues(copiedEnvPath, PLATFORM_TOKEN_KEYS);
  await updateCopiedMetaNameAndPort(toHome, apiServerPort);

  const newAgent = await getAgent(newAgentId);
  return NextResponse.json(newAgent, { status: 201 });
}
