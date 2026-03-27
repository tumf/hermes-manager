import path from 'node:path';

import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { db, schema } from '../../../src/lib/db';

const CreateSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Name must contain only letters, numbers, hyphens, and underscores'),
});

export async function GET() {
  const agents = await db.select().from(schema.agents).all();
  return NextResponse.json(agents);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name } = parsed.data;
  const home = path.join(process.env.HOME ?? '/tmp', '.hermes', name);
  const label = `ai.hermes.gateway.${name}`;

  const existing = await db.select().from(schema.agents).where(eq(schema.agents.name, name)).get();
  if (existing) {
    return NextResponse.json({ error: `Agent "${name}" already exists` }, { status: 409 });
  }

  const [agent] = await db
    .insert(schema.agents)
    .values({ name, home, label, enabled: false })
    .returning();

  return NextResponse.json(agent, { status: 201 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');

  if (!name) {
    return NextResponse.json({ error: 'name query param required' }, { status: 400 });
  }

  const existing = await db.select().from(schema.agents).where(eq(schema.agents.name, name)).get();
  if (!existing) {
    return NextResponse.json({ error: `Agent "${name}" not found` }, { status: 404 });
  }

  await db.delete(schema.agents).where(eq(schema.agents.name, name));
  return NextResponse.json({ deleted: name });
}
