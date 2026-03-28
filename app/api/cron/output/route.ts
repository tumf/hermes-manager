import fs from 'node:fs';
import path from 'node:path';

import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { getCronHome } from '@/src/lib/cron';
import { db, schema } from '@/src/lib/db';
import { CronOutputSchema } from '@/src/lib/validators/cron';

/**
 * GET /api/cron/output?agent=<name>&id=<id>[&file=<filename>]
 * List or read output files for a cron job
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agentName = searchParams.get('agent');
  const jobId = searchParams.get('id');
  const fileName = searchParams.get('file');

  if (!agentName || !jobId) {
    return NextResponse.json({ error: 'Missing agent or id' }, { status: 400 });
  }

  const result = CronOutputSchema.safeParse({ agent: agentName, id: jobId, file: fileName });
  if (!result.success) {
    return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
  }

  // Verify agent exists
  const [agent] = await db.select().from(schema.agents).where(eq(schema.agents.agentId, agentName));
  if (!agent) {
    return NextResponse.json({ error: 'agent not found' }, { status: 404 });
  }

  // Construct output directory path
  const cronHome = getCronHome(agent.home);
  const outputDir = path.join(cronHome, 'output', jobId);

  // If reading a specific file
  if (fileName) {
    // Validate fileName to prevent traversal
    if (fileName.includes('..') || fileName.includes('/')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    const filePath = path.join(outputDir, fileName);

    // Double-check the resolved path is within outputDir
    const resolvedPath = path.resolve(filePath);
    const resolvedDir = path.resolve(outputDir);
    if (!resolvedPath.startsWith(resolvedDir)) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'file not found' }, { status: 404 });
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return NextResponse.json({ content });
    } catch (err) {
      console.error(`Failed to read output file ${filePath}:`, err);
      return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
    }
  }

  // List output files
  if (!fs.existsSync(outputDir)) {
    return NextResponse.json({ files: [] });
  }

  try {
    const entries = fs.readdirSync(outputDir);
    // Filter for .md files and sort newest first
    const files = entries
      .filter((name) => name.endsWith('.md'))
      .sort()
      .reverse();

    return NextResponse.json({ files });
  } catch (err) {
    console.error(`Failed to list output files in ${outputDir}:`, err);
    return NextResponse.json({ error: 'Failed to list files' }, { status: 500 });
  }
}
