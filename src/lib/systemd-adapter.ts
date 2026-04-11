import os from 'node:os';
import path from 'node:path';

import type { ExecResult } from './launchd';
import { getProjectRootPath, getRuntimeGlobalsRootPath } from './runtime-paths';
import type { ServiceAdapter } from './service-manager';

function getUnitDir(): string {
  return path.join(os.homedir(), '.config', 'systemd', 'user');
}

function getUnitFileName(agentId: string): string {
  return `ai.hermes.gateway.${agentId}.service`;
}

function toUnitName(label: string): string {
  return label.endsWith('.service') ? label : `${label}.service`;
}

export const systemdAdapter: ServiceAdapter = {
  type: 'systemd',

  getServiceDefinitionPath(agentId: string): string {
    return path.join(getUnitDir(), getUnitFileName(agentId));
  },

  generateServiceDefinition(
    _agentId: string,
    home: string,
    label: string,
    apiServerPort: number | null,
  ): string {
    const runnerScriptPath = getProjectRootPath('scripts', 'run-agent-gateway.sh');
    const globalsEnvPath = getRuntimeGlobalsRootPath('.env');
    const agentEnvPath = path.join(home, '.env');
    const logDir = path.join(home, 'logs');

    const envLines = [`Environment=HERMES_HOME=${home}`];
    if (apiServerPort !== null) {
      envLines.push(`Environment=API_SERVER_ENABLED=true`);
      envLines.push(`Environment=API_SERVER_PORT=${apiServerPort}`);
    }

    return `[Unit]
Description=${label}
After=network.target

[Service]
Type=simple
ExecStart=/bin/bash ${runnerScriptPath} ${agentEnvPath} ${globalsEnvPath}
WorkingDirectory=${home}
${envLines.join('\n')}
StandardOutput=append:${logDir}/gateway.log
StandardError=append:${logDir}/gateway.error.log
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
`;
  },

  buildInstallCommands(agentId: string) {
    return {
      pre: [],
      bootstrap: ['systemctl', '--user', 'daemon-reload'],
      post: [['systemctl', '--user', 'enable', getUnitFileName(agentId)]],
    };
  },

  buildUninstallCommands(agentId: string) {
    const unitName = getUnitFileName(agentId);
    return {
      pre: [['systemctl', '--user', 'disable', unitName]],
      remove: ['systemctl', '--user', 'daemon-reload'],
      post: [],
    };
  },

  buildStartCommand(label: string): string[] {
    return ['systemctl', '--user', 'start', toUnitName(label)];
  },

  buildStopCommand(label: string): string[] {
    return ['systemctl', '--user', 'stop', toUnitName(label)];
  },

  buildRestartCommand(label: string): string[] {
    return ['systemctl', '--user', 'restart', toUnitName(label)];
  },

  buildStatusCommand(label: string): string[] {
    return [
      'systemctl',
      '--user',
      'show',
      toUnitName(label),
      '--property=ActiveState',
      '--property=MainPID',
      '--no-pager',
    ];
  },

  parseRunning(stdout: string): boolean {
    const activeState = stdout.match(/^ActiveState=(.+)$/m)?.[1]?.trim();
    if (activeState) {
      return activeState === 'active';
    }
    return /Active:\s*active\s*\(running\)/i.test(stdout);
  },

  parsePid(stdout: string): number | null {
    const showPid = stdout.match(/^MainPID=(\d+)$/m)?.[1];
    const statusPid = stdout.match(/Main PID:\s*(\d+)/)?.[1];
    const value = showPid ?? statusPid;
    if (!value) {
      return null;
    }
    const pid = Number(value);
    return pid > 0 ? pid : null;
  },

  isServiceMissing(result: ExecResult): boolean {
    if (result.code === 0) return false;
    const combined = `${result.stdout}\n${result.stderr}`;
    return /could not be found|not found|No such file/i.test(combined);
  },
};
