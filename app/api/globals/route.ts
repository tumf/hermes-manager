import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { db, schema } from '../../../src/lib/db';
import { regenerateGlobalsEnv } from '../../../src/lib/globals-env';
import { upsertGlobalSchema } from '../../../src/lib/validators/globals';

const MASKED_VALUE = '***';

function toManagementRow(row: {
  id: number;
  scope: string;
  key: string;
  value: string;
  visibility: string;
}) {
  const visibility = row.visibility === 'secure' ? 'secure' : 'plain';
  const masked = visibility === 'secure';

  return {
    ...row,
    visibility,
    value: masked ? MASKED_VALUE : row.value,
    masked,
  };
}

export async function GET() {
  const rows = await db.select().from(schema.envVars).where(eq(schema.envVars.scope, 'global'));
  return NextResponse.json(rows.map(toManagementRow));
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

  const existing = await db
    .select()
    .from(schema.envVars)
    .where(and(eq(schema.envVars.scope, 'global'), eq(schema.envVars.key, key)));

  const safeVisibility = visibility === 'secure' ? 'secure' : 'plain';

  let row;
  if (existing.length > 0) {
    const updated = await db
      .update(schema.envVars)
      .set({ value, visibility: safeVisibility })
      .where(and(eq(schema.envVars.scope, 'global'), eq(schema.envVars.key, key)))
      .returning();
    row = updated[0];
  } else {
    const inserted = await db
      .insert(schema.envVars)
      .values({ scope: 'global', key, value, visibility: safeVisibility })
      .returning();
    row = inserted[0];
  }

  await regenerateGlobalsEnv();
  return NextResponse.json(toManagementRow(row), { status: 200 });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  if (!key) {
    return NextResponse.json({ error: 'key query param required' }, { status: 400 });
  }

  await db
    .delete(schema.envVars)
    .where(and(eq(schema.envVars.scope, 'global'), eq(schema.envVars.key, key)));

  await regenerateGlobalsEnv();
  return NextResponse.json({ deleted: key });
}
