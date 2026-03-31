import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getAgent } from '@/src/lib/agents';

const execFileAsync = promisify(execFile);

const ChatBodySchema = z.object({
  message: z.string().min(1).max(4096),
  sessionId: z
    .string()
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = ChatBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'invalid body' },
      { status: 400 },
    );
  }

  const agent = await getAgent(id);
  if (!agent) {
    return NextResponse.json({ error: 'agent not found' }, { status: 404 });
  }

  const args = ['chat', '-q', parsed.data.message, '-Q', '--source', 'tool'];
  if (parsed.data.sessionId) {
    args.push('--resume', parsed.data.sessionId);
  }

  try {
    const result = await execFileAsync('hermes', args, {
      env: { ...process.env, HERMES_HOME: agent.home },
      timeout: 120_000,
      maxBuffer: 1024 * 1024,
    });

    return NextResponse.json({
      ok: true,
      stdout: result.stdout,
      stderr: result.stderr,
    });
  } catch (error) {
    const err = error as Error & { stdout?: string; stderr?: string };
    return NextResponse.json(
      {
        error: err.message,
        stdout: err.stdout ?? '',
        stderr: err.stderr ?? '',
      },
      { status: 500 },
    );
  }
}
