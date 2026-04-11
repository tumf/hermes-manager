import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { allocateApiServerPort, getAgent, readAgentMeta, updateAgentMeta } from '@/src/lib/agents';
import type { ExecResult } from '@/src/lib/launchd';
import type { ServiceAdapter } from '@/src/lib/service-manager';
import { getServiceAdapter } from '@/src/lib/service-manager';

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

function getAdapter(): ServiceAdapter {
  return getServiceAdapter();
}

function getServiceUnitName(adapter: ServiceAdapter, agentName: string, label: string): string {
  if (adapter.type === 'systemd') {
    return `ai.hermes.gateway.${agentName}.service`;
  }
  return label;
}

const POLL_INTERVAL = 500;
const POLL_TIMEOUT = 10_000;

async function waitForState(
  target: 'running' | 'stopped',
  adapter: ServiceAdapter,
  uid: number,
  label: string,
): Promise<{ running: boolean; pid: number | null; timedOut: boolean }> {
  const deadline = Date.now() + POLL_TIMEOUT;
  while (Date.now() < deadline) {
    const statusCmd = adapter.buildStatusCommand(label, uid);
    const r = await runExecFile(statusCmd[0], statusCmd.slice(1));
    const running = adapter.parseRunning(r.stdout);
    const pid = adapter.parsePid(r.stdout);
    if (target === 'running' && running && pid !== null) {
      return { running: true, pid, timedOut: false };
    }
    if (target === 'stopped' && !running) {
      return { running: false, pid: null, timedOut: false };
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
  }
  const statusCmd = adapter.buildStatusCommand(label, uid);
  const r = await runExecFile(statusCmd[0], statusCmd.slice(1));
  return { running: adapter.parseRunning(r.stdout), pid: adapter.parsePid(r.stdout), timedOut: true };
}

async function ensureServiceBootstrapped(
  adapter: ServiceAdapter,
  agentName: string,
  home: string,
  label: string,
  uid: number,
  apiServerPort: number | null,
): Promise<ExecResult> {
  const content = adapter.generateServiceDefinition(agentName, home, label, apiServerPort);
  const defPath = adapter.getServiceDefinitionPath(agentName);

  fs.mkdirSync(path.dirname(defPath), { recursive: true });
  fs.writeFileSync(defPath, content, 'utf8');

  const cmds = adapter.buildInstallCommands(agentName, label);

  if (adapter.type === 'launchd') {
    const check = await runExecFile(cmds.pre[0][0], cmds.pre[0].slice(1));
    if (check.code === 0) {
      const unitName = getServiceUnitName(adapter, agentName, label);
      const bootout = await runExecFile('launchctl', ['bootout', `gui/${uid}/${unitName}`]);
      if (bootout.code !== 0 && !adapter.isServiceMissing(bootout)) {
        return bootout;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  const bootstrapResult = await runExecFile(cmds.bootstrap[0], cmds.bootstrap.slice(1));
  if (bootstrapResult.code !== 0) {
    return bootstrapResult;
  }

  for (const postCmd of cmds.post) {
    const postResult = await runExecFile(postCmd[0], postCmd.slice(1));
    if (postResult.code !== 0) {
      return postResult;
    }
  }

  return bootstrapResult;
}

async function ensureAgentApiServerPort(agentName: string): Promise<number | null> {
  const agentMeta = await readAgentMeta(agentName);
  if (!agentMeta) {
    return null;
  }

  if (typeof agentMeta.apiServerPort === 'number') {
    return agentMeta.apiServerPort;
  }

  const apiServerPort = await allocateApiServerPort();
  const updated = await updateAgentMeta(agentName, {
    ...agentMeta,
    apiServerPort,
  });

  if (typeof updated?.apiServerPort === 'number') {
    return updated.apiServerPort;
  }

  const refreshedMeta = await readAgentMeta(agentName);
  return typeof refreshedMeta?.apiServerPort === 'number' ? refreshedMeta.apiServerPort : null;
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

  const agentRow = await getAgent(agentName);
  if (!agentRow) {
    return NextResponse.json({ error: `Agent "${agentName}" not found` }, { status: 404 });
  }

  const adapter = getAdapter();
  const { home, label } = agentRow;
  const uid = getUid();
  const unitName = getServiceUnitName(adapter, agentName, label);
  const ensuredApiServerPort =
    action === 'install' || action === 'start' || action === 'restart'
      ? await ensureAgentApiServerPort(agentName)
      : agentRow.apiServerPort;

  if (
    (action === 'install' || action === 'start' || action === 'restart') &&
    ensuredApiServerPort === null
  ) {
    return NextResponse.json(
      { error: 'Failed to resolve api server port for agent' },
      { status: 500 },
    );
  }

  if (action === 'install') {
    const result = await ensureServiceBootstrapped(
      adapter,
      agentName,
      home,
      label,
      uid,
      ensuredApiServerPort,
    );
    return NextResponse.json({ ...result, manager: adapter.type });
  }

  if (action === 'uninstall') {
    const cmds = adapter.buildUninstallCommands(agentName, label);

    for (const preCmd of cmds.pre) {
      await runExecFile(preCmd[0], preCmd.slice(1));
    }

    const result = await runExecFile(cmds.remove[0], cmds.remove.slice(1));

    const defPath = adapter.getServiceDefinitionPath(agentName);
    try {
      fs.unlinkSync(defPath);
    } catch {
      // Ignore if already removed
    }

    for (const postCmd of cmds.post) {
      await runExecFile(postCmd[0], postCmd.slice(1));
    }

    return NextResponse.json({ ...result, manager: adapter.type });
  }

  if (action === 'start') {
    const bootstrapResult = await ensureServiceBootstrapped(
      adapter,
      agentName,
      home,
      label,
      uid,
      ensuredApiServerPort,
    );
    if (bootstrapResult.code !== 0) {
      return NextResponse.json(bootstrapResult, { status: 500 });
    }

    const startCmd = adapter.buildStartCommand(unitName);
    const result = await runExecFile(startCmd[0], startCmd.slice(1));
    if (result.code !== 0) {
      return NextResponse.json({ ...result, running: false, manager: adapter.type }, { status: 500 });
    }
    const state = await waitForState('running', adapter, uid, unitName);
    return NextResponse.json({
      ...result,
      running: state.running,
      pid: state.pid,
      timedOut: state.timedOut,
      manager: adapter.type,
    });
  }

  if (action === 'stop') {
    const stopCmd = adapter.buildStopCommand(unitName);
    const result = await runExecFile(stopCmd[0], stopCmd.slice(1));
    if (result.code !== 0) {
      return NextResponse.json({ ...result, running: true, manager: adapter.type }, { status: 500 });
    }
    const state = await waitForState('stopped', adapter, uid, unitName);
    return NextResponse.json({
      ...result,
      running: state.running,
      pid: state.pid,
      timedOut: state.timedOut,
      manager: adapter.type,
    });
  }

  if (action === 'restart') {
    const bootstrapResult = await ensureServiceBootstrapped(
      adapter,
      agentName,
      home,
      label,
      uid,
      ensuredApiServerPort,
    );
    if (bootstrapResult.code !== 0) {
      return NextResponse.json(bootstrapResult, { status: 500 });
    }

    const restartCmd = adapter.buildRestartCommand(unitName, uid);
    const result = await runExecFile(restartCmd[0], restartCmd.slice(1));
    if (result.code !== 0) {
      return NextResponse.json({ ...result, running: false, manager: adapter.type }, { status: 500 });
    }
    const state = await waitForState('running', adapter, uid, unitName);
    if (!state.running) {
      return NextResponse.json(
        { ...result, running: false, pid: null, timedOut: state.timedOut, manager: adapter.type },
        { status: 500 },
      );
    }
    return NextResponse.json({
      ...result,
      running: state.running,
      pid: state.pid,
      timedOut: state.timedOut,
      manager: adapter.type,
    });
  }

  // action === 'status'
  const statusCmd = adapter.buildStatusCommand(unitName, uid);
  const result = await runExecFile(statusCmd[0], statusCmd.slice(1));
  const running = adapter.parseRunning(result.stdout);
  const pid = adapter.parsePid(result.stdout);
  return NextResponse.json({
    running,
    pid,
    output: result.stdout,
    stdout: result.stdout,
    stderr: result.stderr,
    code: result.code,
    manager: adapter.type,
  });
}
