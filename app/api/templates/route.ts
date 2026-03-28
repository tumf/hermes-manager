import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { db, schema } from '@/src/lib/db';
import {
  CreateTemplateSchema,
  UpdateTemplateSchema,
  fileTypeSchema,
} from '@/src/lib/validators/templates';

/** GET /api/templates?fileType=config.yaml (optional filter) */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileTypeParam = searchParams.get('fileType');

  if (fileTypeParam) {
    const parsed = fileTypeSchema.safeParse(fileTypeParam);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid fileType. Must be one of: agents.md, soul.md, config.yaml' },
        { status: 400 },
      );
    }
    const rows = await db
      .select()
      .from(schema.templates)
      .where(eq(schema.templates.fileType, parsed.data));
    return NextResponse.json(rows);
  }

  const rows = await db.select().from(schema.templates);
  return NextResponse.json(rows);
}

/** POST /api/templates — create a new template */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const result = CreateTemplateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
  }

  const { fileType, name, content } = result.data;

  // Check for duplicate (fileType + name unique)
  const existing = await db
    .select()
    .from(schema.templates)
    .where(and(eq(schema.templates.fileType, fileType), eq(schema.templates.name, name)));

  if (existing.length > 0) {
    return NextResponse.json(
      { error: `Template "${name}" already exists for fileType "${fileType}"` },
      { status: 409 },
    );
  }

  const [row] = await db.insert(schema.templates).values({ fileType, name, content }).returning();
  return NextResponse.json(row, { status: 201 });
}

/** PUT /api/templates — update an existing template */
export async function PUT(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const result = UpdateTemplateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
  }

  const { fileType, name, content } = result.data;

  const existing = await db
    .select()
    .from(schema.templates)
    .where(and(eq(schema.templates.fileType, fileType), eq(schema.templates.name, name)));

  if (existing.length === 0) {
    return NextResponse.json(
      { error: `Template "${name}" not found for fileType "${fileType}"` },
      { status: 404 },
    );
  }

  const [row] = await db
    .update(schema.templates)
    .set({ content, updatedAt: new Date() })
    .where(and(eq(schema.templates.fileType, fileType), eq(schema.templates.name, name)))
    .returning();
  return NextResponse.json(row);
}

/** DELETE /api/templates?fileType=...&name=... */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileTypeParam = searchParams.get('fileType');
  const name = searchParams.get('name');

  if (!fileTypeParam || !name) {
    return NextResponse.json({ error: 'fileType and name query params required' }, { status: 400 });
  }

  const parsedFileType = fileTypeSchema.safeParse(fileTypeParam);
  if (!parsedFileType.success) {
    return NextResponse.json(
      { error: 'Invalid fileType. Must be one of: agents.md, soul.md, config.yaml' },
      { status: 400 },
    );
  }

  const existing = await db
    .select()
    .from(schema.templates)
    .where(
      and(eq(schema.templates.fileType, parsedFileType.data), eq(schema.templates.name, name)),
    );

  if (existing.length === 0) {
    return NextResponse.json(
      { error: `Template "${name}" not found for fileType "${parsedFileType.data}"` },
      { status: 404 },
    );
  }

  await db
    .delete(schema.templates)
    .where(
      and(eq(schema.templates.fileType, parsedFileType.data), eq(schema.templates.name, name)),
    );

  return NextResponse.json({ ok: true });
}
