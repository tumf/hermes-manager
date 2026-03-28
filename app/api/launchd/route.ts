import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { db, schema } from '../../../src/lib/db';
import {
  generatePlist,
  getPlistPath,
  isServiceMissing,
  parseRunning,
  type ExecResult,
} from '@/src/lib/launchd';

const execFileAsync = promisify(execFile);

const RequestSchema = z.object({
  agent: z.string(),
  action: z.enum(['install', 'uninstall', 'start', 'stop', 'restart', 'status']),
});

async function runExecFile(cmd: string, args: string[]): Promise<ExecResult> {
  try {
    const { stdout, stderr } = await execFileAsync(cmd, args);
    return { stdout, stderr, code: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return {
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? '',
      code: typeof e.code === 'number' ? e.code : 1,
    };
  }
}

function getUid(): number {
  return process.getuid ? process.getuid() : 501;
}

async function ensureServiceBootstrapped(
  agentName: string,
  home: string,
  label: string,
  uid: number,
): Promise<ExecResult> {
  const plistContent = generatePlist(agentName, home, label);
  const plistPath = getPlistPath(agentName);

  fs.mkdirSync(path.dirname(plistPath), { recursive: true });
  fs.writeFileSync(plistPath, plistContent, 'utf8');

  return runExecFile('launchctl', ['bootstrap', `gui/${uid}`, plistPath]);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { agent: agentName, action } = parsed.data;

  // Look up agent from database
  const agentRow = await db
    .select()
    .from(schema.agents)
    .where(eq(schema.agents.name, agentName))
    .get();

  if (!agentRow) {
    return NextResponse.json({ error: `Agent "${agentName}" not found` }, { status: 404 });
  }

  const { home, label } = agentRow;
  const uid = getUid();

  if (action === 'install') {
    const result = await ensureServiceBootstrapped(agentName, home, label, uid);
    return NextResponse.json(result);
  }

  if (action === 'uninstall') {
    const result = await runExecFile('launchctl', ['bootout', `gui/${uid}/${label}`]);
    const plistPath = getPlistPath(agentName);
    try {
      fs.unlinkSync(plistPath);
    } catch {
      // Ignore if already removed
    }
    return NextResponse.json(result);
  }

  if (action === 'start') {
    const currentStatus = await runExecFile('launchctl', ['print', `gui/${uid}/${label}`]);

    if (isServiceMissing(currentStatus)) {
      const bootstrapResult = await ensureServiceBootstrapped(agentName, home, label, uid);
      if (bootstrapResult.code !== 0) {
        return NextResponse.json(bootstrapResult, { status: 500 });
      }
    }

    const result = await runExecFile('launchctl', ['start', label]);
    return NextResponse.json(result, { status: result.code === 0 ? 200 : 500 });
  }

  if (action === 'stop') {
    const result = await runExecFile('launchctl', ['stop', label]);
    return NextResponse.json(result, { status: result.code === 0 ? 200 : 500 });
  }

  if (action === 'restart') {
    const stopResult = await runExecFile('launchctl', ['stop', label]);
    if (stopResult.code !== 0) {
      return NextResponse.json(stopResult, { status: 500 });
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
    const startResult = await runExecFile('launchctl', ['start', label]);
    return NextResponse.json(startResult, { status: startResult.code === 0 ? 200 : 500 });
  }

  // action === 'status'
  const result = await runExecFile('launchctl', ['print', `gui/${uid}/${label}`]);
  const running = parseRunning(result.stdout);
  return NextResponse.json({
    running,
    output: result.stdout,
    stdout: result.stdout,
    stderr: result.stderr,
    code: result.code,
  });
}
