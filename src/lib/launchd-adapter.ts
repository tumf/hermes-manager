import type { ExecResult } from './launchd';
import {
  generatePlist,
  getPlistPath,
  isServiceMissing as isServiceMissingError,
  parsePid,
  parseRunning,
} from './launchd';
import type { ServiceAdapter } from './service-manager';

export const launchdAdapter: ServiceAdapter = {
  type: 'launchd',

  getServiceDefinitionPath(agentId: string): string {
    return getPlistPath(agentId);
  },

  async generateServiceDefinition(
    agentId: string,
    home: string,
    label: string,
    apiServerPort: number | null,
  ): Promise<string> {
    return await generatePlist(agentId, home, label, apiServerPort);
  },

  buildInstallCommands(agentId: string, label: string) {
    const plistPath = getPlistPath(agentId);
    const uid = getUid();
    return {
      pre: [['launchctl', 'print', `gui/${uid}/${label}`]],
      bootstrap: ['launchctl', 'bootstrap', `gui/${uid}`, plistPath],
      post: [],
    };
  },

  buildUninstallCommands(_agentId: string, label: string) {
    const uid = getUid();
    return {
      pre: [],
      remove: ['launchctl', 'bootout', `gui/${uid}/${label}`],
      post: [],
    };
  },

  buildStartCommand(label: string): string[] {
    return ['launchctl', 'start', label];
  },

  buildStopCommand(label: string): string[] {
    return ['launchctl', 'stop', label];
  },

  buildRestartCommand(label: string, uid: number): string[] {
    return ['launchctl', 'kickstart', '-kp', `gui/${uid}/${label}`];
  },

  buildStatusCommand(label: string, uid: number): string[] {
    return ['launchctl', 'print', `gui/${uid}/${label}`];
  },

  parseRunning(stdout: string): boolean {
    return parseRunning(stdout);
  },

  parsePid(stdout: string): number | null {
    return parsePid(stdout);
  },

  isServiceMissing(result: ExecResult): boolean {
    return isServiceMissingError(result);
  },
};

function getUid(): number {
  return process.getuid ? process.getuid() : 501;
}
