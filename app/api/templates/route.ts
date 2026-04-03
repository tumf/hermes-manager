import { NextRequest, NextResponse } from 'next/server';

import {
  deleteTemplate,
  deleteTemplateFile,
  getTemplateFile,
  isValidFileName,
  isValidName,
  listTemplates,
  writeTemplateFile,
} from '@/src/lib/templates';
import {
  CreateTemplateSchema,
  UpdateTemplateSchema,
  fileSchema,
  templateNameSchema,
} from '@/src/lib/validators/templates';

/**
 * GET /api/templates — list all templates
 * GET /api/templates?name=...&file=... — get a specific template file
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');
  const file = searchParams.get('file');

  // If both name and file are provided, return specific file content
  if (name && file) {
    if (!isValidName(name)) {
      return NextResponse.json({ error: 'Invalid template name' }, { status: 400 });
    }
    if (!isValidFileName(file)) {
      return NextResponse.json(
        { error: 'Invalid file. Must be one of: MEMORY.md, USER.md, SOUL.md, config.yaml' },
        { status: 400 },
      );
    }

    const result = getTemplateFile(name, file);
    if (!result) {
      return NextResponse.json(
        { error: `Template file "${name}/${file}" not found` },
        { status: 404 },
      );
    }
    return NextResponse.json(result);
  }

  // List all templates
  const templates = listTemplates();
  return NextResponse.json(templates);
}

/** POST /api/templates — create a new template file */
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

  const { file, name, content } = result.data;

  // Check if file already exists (409 for duplicate)
  const existing = getTemplateFile(name, file);
  if (existing) {
    return NextResponse.json(
      { error: `Template "${name}/${file}" already exists` },
      { status: 409 },
    );
  }

  const written = writeTemplateFile(name, file, content);
  return NextResponse.json(written, { status: 201 });
}

/** PUT /api/templates — update an existing template file */
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

  const { file, name, content } = result.data;

  const existing = getTemplateFile(name, file);
  if (!existing) {
    return NextResponse.json({ error: `Template "${name}/${file}" not found` }, { status: 404 });
  }

  const written = writeTemplateFile(name, file, content);
  return NextResponse.json(written);
}

/**
 * DELETE /api/templates?name=...&file=... — delete a single file
 * DELETE /api/templates?name=... — delete entire template directory
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');
  const file = searchParams.get('file');

  if (!name) {
    return NextResponse.json({ error: 'name query param required' }, { status: 400 });
  }

  const parsedName = templateNameSchema.safeParse(name);
  if (!parsedName.success) {
    return NextResponse.json({ error: 'Invalid template name' }, { status: 400 });
  }

  if (file) {
    // Delete a single file
    const parsedFile = fileSchema.safeParse(file);
    if (!parsedFile.success) {
      return NextResponse.json(
        { error: 'Invalid file. Must be one of: MEMORY.md, USER.md, SOUL.md, config.yaml' },
        { status: 400 },
      );
    }

    const deleted = deleteTemplateFile(parsedName.data, parsedFile.data);
    if (!deleted) {
      return NextResponse.json(
        { error: `Template file "${name}/${file}" not found` },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  }

  // Delete entire template directory
  const deleted = deleteTemplate(parsedName.data);
  if (!deleted) {
    return NextResponse.json({ error: `Template "${name}" not found` }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
