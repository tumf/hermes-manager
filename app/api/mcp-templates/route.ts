import { NextRequest, NextResponse } from 'next/server';

import {
  deleteMcpTemplate,
  getMcpTemplate,
  listMcpTemplates,
  McpTemplateError,
  mcpTemplateExists,
  writeMcpTemplate,
} from '@/src/lib/mcp-templates';
import {
  CreateMcpTemplateSchema,
  UpdateMcpTemplateSchema,
  mcpTemplateNameSchema,
} from '@/src/lib/validators/mcp-templates';

/**
 * GET /api/mcp-templates — list templates
 * GET /api/mcp-templates?name=... — get a template's content
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');

  if (name) {
    const parsed = mcpTemplateNameSchema.safeParse(name);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid MCP template name' }, { status: 400 });
    }
    const record = getMcpTemplate(parsed.data);
    if (!record) {
      return NextResponse.json(
        { error: `MCP template "${parsed.data}" not found` },
        { status: 404 },
      );
    }
    return NextResponse.json(record);
  }

  return NextResponse.json(listMcpTemplates());
}

/** POST /api/mcp-templates — create a new MCP template */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const result = CreateMcpTemplateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
  }

  const { name, content } = result.data;

  if (mcpTemplateExists(name)) {
    return NextResponse.json({ error: `MCP template "${name}" already exists` }, { status: 409 });
  }

  try {
    const written = writeMcpTemplate(name, content);
    return NextResponse.json(written, { status: 201 });
  } catch (error) {
    if (error instanceof McpTemplateError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}

/** PUT /api/mcp-templates — update an existing MCP template */
export async function PUT(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const result = UpdateMcpTemplateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
  }

  const { name, content } = result.data;
  if (!mcpTemplateExists(name)) {
    return NextResponse.json({ error: `MCP template "${name}" not found` }, { status: 404 });
  }

  try {
    const written = writeMcpTemplate(name, content);
    return NextResponse.json(written);
  } catch (error) {
    if (error instanceof McpTemplateError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}

/** DELETE /api/mcp-templates?name=... — delete an MCP template */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');

  if (!name) {
    return NextResponse.json({ error: 'name query param required' }, { status: 400 });
  }

  const parsed = mcpTemplateNameSchema.safeParse(name);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid MCP template name' }, { status: 400 });
  }

  const deleted = deleteMcpTemplate(parsed.data);
  if (!deleted) {
    return NextResponse.json({ error: `MCP template "${parsed.data}" not found` }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
