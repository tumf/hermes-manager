import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { db, schema } from '../../../src/lib/db';
import { regenerateGlobalsEnv } from '../../../src/lib/globals-env';
import { upsertGlobalSchema } from '../../../src/lib/validators/globals';

export async function GET() {
  const rows = await db.select().from(schema.envVars).where(eq(schema.envVars.scope, 'global'));
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = upsertGlobalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { key, value } = parsed.data;

  const existing = await db
    .select()
    .from(schema.envVars)
    .where(and(eq(schema.envVars.scope, 'global'), eq(schema.envVars.key, key)));

  let row;
  if (existing.length > 0) {
    const updated = await db
      .update(schema.envVars)
      .set({ value })
      .where(and(eq(schema.envVars.scope, 'global'), eq(schema.envVars.key, key)))
      .returning();
    row = updated[0];
  } else {
    const inserted = await db
      .insert(schema.envVars)
      .values({ scope: 'global', key, value })
      .returning();
    row = inserted[0];
  }

  await regenerateGlobalsEnv();
  return NextResponse.json(row, { status: 200 });
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
