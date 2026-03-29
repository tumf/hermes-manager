import fs from 'node:fs/promises';

import { NextRequest, NextResponse } from 'next/server';

import { deleteKey, parse, serialize, upsert } from '@/src/lib/dotenv-parser';
import { readEnvMeta, removeVisibility, setVisibility } from '@/src/lib/env-meta';
import { getRuntimeGlobalsRootPath } from '@/src/lib/runtime-paths';
import { upsertGlobalSchema } from '@/src/lib/validators/globals';

const MASKED_VALUE = '***';

async function readGlobalsEnv(): Promise<string> {
  try {
    return await fs.readFile(getRuntimeGlobalsRootPath('.env'), 'utf-8');
  } catch {
    return '';
  }
}

async function writeGlobalsEnv(content: string): Promise<void> {
  const dir = getRuntimeGlobalsRootPath();
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(getRuntimeGlobalsRootPath('.env'), content, 'utf-8');
}

export async function GET() {
  const content = await readGlobalsEnv();
  const entries = parse(content);
  const globalsDir = getRuntimeGlobalsRootPath();
  const meta = await readEnvMeta(globalsDir);

  const rows = entries.map((entry) => {
    const visibility = meta[entry.key]?.visibility === 'secure' ? 'secure' : 'plain';
    const masked = visibility === 'secure';
    return {
      scope: 'global',
      key: entry.key,
      value: masked ? MASKED_VALUE : entry.value,
      visibility,
      masked,
    };
  });

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = upsertGlobalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { key, value, visibility } = parsed.data;
  const safeVisibility = visibility === 'secure' ? 'secure' : 'plain';

  // Read current .env, upsert the key, write back
  const content = await readGlobalsEnv();
  const entries = upsert(parse(content), key, value);
  await writeGlobalsEnv(serialize(entries));

  // Update visibility metadata
  const globalsDir = getRuntimeGlobalsRootPath();
  await setVisibility(globalsDir, key, safeVisibility);

  const masked = safeVisibility === 'secure';
  return NextResponse.json(
    {
      scope: 'global',
      key,
      value: masked ? MASKED_VALUE : value,
      visibility: safeVisibility,
      masked,
    },
    { status: 200 },
  );
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  if (!key) {
    return NextResponse.json({ error: 'key query param required' }, { status: 400 });
  }

  // Remove from .env
  const content = await readGlobalsEnv();
  const entries = deleteKey(parse(content), key);
  await writeGlobalsEnv(serialize(entries));

  // Remove visibility metadata
  const globalsDir = getRuntimeGlobalsRootPath();
  await removeVisibility(globalsDir, key);

  return NextResponse.json({ deleted: key });
}
