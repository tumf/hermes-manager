import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

import { allocateApiServerPort, readAgentMeta, updateAgentMeta } from '@/src/lib/agents';
import type { ExecResult } from '@/src/lib/launchd';
import type { ServiceAdapter } from '@/src/lib/service-manager';
import { getServiceAdapter } from '@/src/lib/service-manager';

const execFileAsync = promisify(execFile);

const POLL_INTERVAL = 500;
const POLL_TIMEOUT = 10_000;

export type ServiceAction = 'install' | 'uninstall' | 'start' | 'stop' | 'restart' | 'status';

export interface ServiceActionParams {
  agentName: string;
  home: string;
  label: string;
  apiServerPort: number | null;
  action: ServiceAction;
}

export interface InstallResult {
  action: 'install' | 'uninstall';
  stdout: string;
  stderr: string;
  code: number;
  manager: string;
}

export interface LifecycleResult {
  action: 'start' | 'stop' | 'restart';
  stdout: string;
  stderr: string;
  code: number;
  running: boolean;
  pid: number | null;
  timedOut: boolean;
  manager: string;
  failed: boolean;
}

export interface StatusResult {
  action: 'status';
  running: boolean;
  pid: number | null;
  output: string;
  stdout: string;
  stderr: string;
  code: number;
  manager: string;
}

export type ServiceActionResult = InstallResult | LifecycleResult | StatusResult;

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

function getServiceUnitName(adapter: ServiceAdapter, agentName: string, label: string): string {
  if (adapter.type === 'systemd') {
    return `ai.hermes.gateway.${agentName}.service`;
  }
  return label;
}

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
  return {
    running: adapter.parseRunning(r.stdout),
    pid: adapter.parsePid(r.stdout),
    timedOut: true,
  };
}

async function writeServiceDefinition(
  adapter: ServiceAdapter,
  agentName: string,
  home: string,
  label: string,
  apiServerPort: number | null,
): Promise<void> {
  const content = await adapter.generateServiceDefinition(agentName, home, label, apiServerPort);
  const defPath = adapter.getServiceDefinitionPath(agentName);

  fs.mkdirSync(path.dirname(defPath), { recursive: true });
  fs.writeFileSync(defPath, content, 'utf8');
}

async function ensureServiceBootstrapped(
  adapter: ServiceAdapter,
  agentName: string,
  home: string,
  label: string,
  uid: number,
  apiServerPort: number | null,
): Promise<ExecResult> {
  await writeServiceDefinition(adapter, agentName, home, label, apiServerPort);

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

export async function ensureAgentApiServerPort(agentName: string): Promise<number | null> {
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

export async function executeServiceAction(
  params: ServiceActionParams,
): Promise<ServiceActionResult> {
  const { agentName, home, label, apiServerPort, action } = params;
  const adapter = getServiceAdapter();
  const uid = getUid();
  const unitName = getServiceUnitName(adapter, agentName, label);

  if (action === 'install') {
    const result = await ensureServiceBootstrapped(
      adapter,
      agentName,
      home,
      label,
      uid,
      apiServerPort,
    );
    return { action: 'install', ...result, manager: adapter.type };
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

    return { action: 'uninstall', ...result, manager: adapter.type };
  }

  if (action === 'start') {
    const bootstrapResult = await ensureServiceBootstrapped(
      adapter,
      agentName,
      home,
      label,
      uid,
      apiServerPort,
    );
    if (bootstrapResult.code !== 0) {
      return {
        action: 'start',
        ...bootstrapResult,
        running: false,
        pid: null,
        timedOut: false,
        manager: adapter.type,
        failed: true,
      };
    }

    const startCmd = adapter.buildStartCommand(unitName);
    const result = await runExecFile(startCmd[0], startCmd.slice(1));
    if (result.code !== 0) {
      return {
        action: 'start',
        ...result,
        running: false,
        pid: null,
        timedOut: false,
        manager: adapter.type,
        failed: true,
      };
    }
    const state = await waitForState('running', adapter, uid, unitName);
    return { action: 'start', ...result, ...state, manager: adapter.type, failed: false };
  }

  if (action === 'stop') {
    const stopCmd = adapter.buildStopCommand(unitName);
    const result = await runExecFile(stopCmd[0], stopCmd.slice(1));
    if (result.code !== 0) {
      return {
        action: 'stop',
        ...result,
        running: true,
        pid: null,
        timedOut: false,
        manager: adapter.type,
        failed: true,
      };
    }
    const state = await waitForState('stopped', adapter, uid, unitName);
    return { action: 'stop', ...result, ...state, manager: adapter.type, failed: false };
  }

  if (action === 'restart') {
    await writeServiceDefinition(adapter, agentName, home, label, apiServerPort);

    const restartCmd = adapter.buildRestartCommand(unitName, uid);
    const result = await runExecFile(restartCmd[0], restartCmd.slice(1));
    if (result.code !== 0) {
      return {
        action: 'restart',
        ...result,
        running: false,
        pid: null,
        timedOut: false,
        manager: adapter.type,
        failed: true,
      };
    }
    const state = await waitForState('running', adapter, uid, unitName);
    if (!state.running) {
      return {
        action: 'restart',
        ...result,
        running: false,
        pid: null,
        timedOut: state.timedOut,
        manager: adapter.type,
        failed: true,
      };
    }
    return { action: 'restart', ...result, ...state, manager: adapter.type, failed: false };
  }

  // action === 'status'
  const statusCmd = adapter.buildStatusCommand(unitName, uid);
  const result = await runExecFile(statusCmd[0], statusCmd.slice(1));
  const running = adapter.parseRunning(result.stdout);
  const pid = adapter.parsePid(result.stdout);
  return {
    action: 'status',
    running,
    pid,
    output: result.stdout,
    stdout: result.stdout,
    stderr: result.stderr,
    code: result.code,
    manager: adapter.type,
  };
}
