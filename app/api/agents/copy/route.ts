import path from 'node:path';

import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { db, schema } from '../../../../src/lib/db';

const CopySchema = z.object({
  from: z.string().min(1),
  to: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Name must contain only letters, numbers, hyphens, and underscores'),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = CopySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { from: fromName, to: toName } = parsed.data;

  const source = await db
    .select()
    .from(schema.agents)
    .where(eq(schema.agents.name, fromName))
    .get();
  if (!source) {
    return NextResponse.json({ error: `Agent "${fromName}" not found` }, { status: 404 });
  }

  const existing = await db
    .select()
    .from(schema.agents)
    .where(eq(schema.agents.name, toName))
    .get();
  if (existing) {
    return NextResponse.json({ error: `Agent "${toName}" already exists` }, { status: 409 });
  }

  const home = path.join(process.env.HOME ?? '/tmp', '.hermes', toName);
  const label = `ai.hermes.gateway.${toName}`;

  const [agent] = await db
    .insert(schema.agents)
    .values({ name: toName, home, label, enabled: false })
    .returning();

  return NextResponse.json(agent, { status: 201 });
}
