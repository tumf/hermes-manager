import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getAgent } from '@/src/lib/agents';
import {
  generatePlist,
  getPlistPath,
  isServiceMissing,
  parsePid,
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

const POLL_INTERVAL = 500;
const POLL_TIMEOUT = 10_000;

async function waitForState(
  target: 'running' | 'stopped',
  uid: number,
  label: string,
): Promise<{ running: boolean; pid: number | null; timedOut: boolean }> {
  const deadline = Date.now() + POLL_TIMEOUT;
  while (Date.now() < deadline) {
    const r = await runExecFile('launchctl', ['print', `gui/${uid}/${label}`]);
    const running = parseRunning(r.stdout);
    const pid = parsePid(r.stdout);
    if (target === 'running' && running && pid !== null) {
      return { running: true, pid, timedOut: false };
    }
    if (target === 'stopped' && !running) {
      return { running: false, pid: null, timedOut: false };
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
  }
  const r = await runExecFile('launchctl', ['print', `gui/${uid}/${label}`]);
  return { running: parseRunning(r.stdout), pid: parsePid(r.stdout), timedOut: true };
}

async function ensureServiceBootstrapped(
  agentName: string,
  home: string,
  label: string,
  uid: number,
  apiServerPort: number | null,
): Promise<ExecResult> {
  const plistContent = generatePlist(agentName, home, label, apiServerPort);
  const plistPath = getPlistPath(agentName);

  fs.mkdirSync(path.dirname(plistPath), { recursive: true });
  fs.writeFileSync(plistPath, plistContent, 'utf8');

  const check = await runExecFile('launchctl', ['print', `gui/${uid}/${label}`]);
  if (check.code === 0) {
    return check;
  }

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

  // Look up agent from filesystem
  const agentRow = await getAgent(agentName);
  if (!agentRow) {
    return NextResponse.json({ error: `Agent "${agentName}" not found` }, { status: 404 });
  }

  const { home, label } = agentRow;
  const uid = getUid();

  if (action === 'install') {
    const result = await ensureServiceBootstrapped(
      agentName,
      home,
      label,
      uid,
      agentRow.apiServerPort,
    );
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
      const bootstrapResult = await ensureServiceBootstrapped(
        agentName,
        home,
        label,
        uid,
        agentRow.apiServerPort,
      );
      if (bootstrapResult.code !== 0) {
        return NextResponse.json(bootstrapResult, { status: 500 });
      }
    }

    const result = await runExecFile('launchctl', ['start', label]);
    if (result.code !== 0) {
      return NextResponse.json({ ...result, running: false }, { status: 500 });
    }
    const state = await waitForState('running', uid, label);
    return NextResponse.json({
      ...result,
      running: state.running,
      pid: state.pid,
      timedOut: state.timedOut,
    });
  }

  if (action === 'stop') {
    const result = await runExecFile('launchctl', ['stop', label]);
    if (result.code !== 0) {
      return NextResponse.json({ ...result, running: true }, { status: 500 });
    }
    const state = await waitForState('stopped', uid, label);
    return NextResponse.json({
      ...result,
      running: state.running,
      pid: state.pid,
      timedOut: state.timedOut,
    });
  }

  if (action === 'restart') {
    // Ensure service is bootstrapped (writes plist + registers if needed)
    const bootstrapResult = await ensureServiceBootstrapped(
      agentName,
      home,
      label,
      uid,
      agentRow.apiServerPort,
    );
    if (bootstrapResult.code !== 0) {
      return NextResponse.json(bootstrapResult, { status: 500 });
    }

    // kickstart -k kills the existing process and restarts it atomically
    const result = await runExecFile('launchctl', ['kickstart', '-kp', `gui/${uid}/${label}`]);
    if (result.code !== 0) {
      return NextResponse.json({ ...result, running: false }, { status: 500 });
    }
    const state = await waitForState('running', uid, label);
    if (!state.running) {
      return NextResponse.json(
        { ...result, running: false, pid: null, timedOut: state.timedOut },
        { status: 500 },
      );
    }
    return NextResponse.json({
      ...result,
      running: state.running,
      pid: state.pid,
      timedOut: state.timedOut,
    });
  }

  // action === 'status'
  const result = await runExecFile('launchctl', ['print', `gui/${uid}/${label}`]);
  const running = parseRunning(result.stdout);
  const pid = parsePid(result.stdout);
  return NextResponse.json({
    running,
    pid,
    output: result.stdout,
    stdout: result.stdout,
    stderr: result.stderr,
    code: result.code,
  });
}
