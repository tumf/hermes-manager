import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { db, schema } from '../../../src/lib/db';

const execFileAsync = promisify(execFile);

const RequestSchema = z.object({
  agent: z.string(),
  action: z.enum(['install', 'uninstall', 'start', 'stop', 'status']),
});

interface ExecResult {
  stdout: string;
  stderr: string;
  code: number;
}

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

function getPlistPath(name: string): string {
  return path.join(os.homedir(), 'Library', 'LaunchAgents', `ai.hermes.gateway.${name}.plist`);
}

function getUid(): number {
  return process.getuid ? process.getuid() : 501;
}

function generatePlist(name: string, home: string, label: string): string {
  const plistPath = path.join(process.cwd(), 'globals', '.env');
  const hermesEnv = path.join(home, '.env');
  const logDir = path.join(home, 'logs');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>dotenvx</string>
    <string>run</string>
    <string>-f</string>
    <string>${hermesEnv}</string>
    <string>-f</string>
    <string>${plistPath}</string>
    <string>--</string>
    <string>hermes</string>
    <string>gateway</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>HERMES_HOME</key>
    <string>${home}</string>
  </dict>
  <key>StandardOutPath</key>
  <string>${logDir}/gateway.log</string>
  <key>StandardErrorPath</key>
  <string>${logDir}/gateway.error.log</string>
  <key>RunAtLoad</key>
  <false/>
</dict>
</plist>
`;
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
    const plistContent = generatePlist(agentName, home, label);
    const plistPath = getPlistPath(agentName);
    // Ensure LaunchAgents dir exists
    fs.mkdirSync(path.dirname(plistPath), { recursive: true });
    fs.writeFileSync(plistPath, plistContent, 'utf8');
    const result = await runExecFile('launchctl', ['bootstrap', `gui/${uid}`, plistPath]);
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
    const result = await runExecFile('launchctl', ['start', label]);
    return NextResponse.json(result);
  }

  if (action === 'stop') {
    const result = await runExecFile('launchctl', ['stop', label]);
    return NextResponse.json(result);
  }

  // action === 'status'
  const result = await runExecFile('launchctl', ['print', `gui/${uid}/${label}`]);
  const stateMatch = result.stdout.match(/state\s*=\s*(\S+)/);
  const running = stateMatch ? stateMatch[1] === 'running' : false;
  return NextResponse.json({
    running,
    output: result.stdout,
    stdout: result.stdout,
    stderr: result.stderr,
    code: result.code,
  });
}
