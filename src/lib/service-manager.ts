import os from 'node:os';

import type { ExecResult } from './launchd';
import { launchdAdapter } from './launchd-adapter';
import { systemdAdapter } from './systemd-adapter';

export type ServiceManagerType = 'launchd' | 'systemd';

export interface ServiceAdapter {
  type: ServiceManagerType;
  getServiceDefinitionPath(agentId: string): string;
  generateServiceDefinition(
    agentId: string,
    home: string,
    label: string,
    apiServerPort: number | null,
  ): string;
  buildInstallCommands(
    agentId: string,
    label: string,
  ): { pre: string[][]; bootstrap: string[]; post: string[][] };
  buildUninstallCommands(
    agentId: string,
    label: string,
  ): { pre: string[][]; remove: string[]; post: string[][] };
  buildStartCommand(label: string): string[];
  buildStopCommand(label: string): string[];
  buildRestartCommand(label: string, uid: number): string[];
  buildStatusCommand(label: string, uid: number): string[];
  parseRunning(stdout: string): boolean;
  parsePid(stdout: string): number | null;
  isServiceMissing(result: ExecResult): boolean;
}

export function detectServiceManager(
  platform: typeof process.platform = os.platform(),
): ServiceManagerType {
  return platform === 'linux' ? 'systemd' : 'launchd';
}

export function getServiceAdapter(
  platform: typeof process.platform = os.platform(),
): ServiceAdapter {
  return detectServiceManager(platform) === 'systemd' ? systemdAdapter : launchdAdapter;
}
