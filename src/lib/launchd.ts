import os from 'node:os';
import path from 'node:path';

import { getProjectRootPath, getRuntimeGlobalsRootPath } from './runtime-paths';

export interface ExecResult {
  stdout: string;
  stderr: string;
  code: number;
}

export function getPlistPath(agentId: string): string {
  return path.join(os.homedir(), 'Library', 'LaunchAgents', `ai.hermes.gateway.${agentId}.plist`);
}

export function generatePlist(
  _agentId: string,
  home: string,
  label: string,
  apiServerPort: number | null,
): string {
  const runnerScriptPath = getProjectRootPath('scripts', 'run-agent-gateway.sh');
  const globalsEnvPath = getRuntimeGlobalsRootPath('.env');
  const agentEnvPath = path.join(home, '.env');
  const logDir = path.join(home, 'logs');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${runnerScriptPath}</string>
    <string>${agentEnvPath}</string>
    <string>${globalsEnvPath}</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>HERMES_HOME</key>
    <string>${home}</string>
    <key>API_SERVER_ENABLED</key>
    <string>true</string>
    <key>API_SERVER_PORT</key>
    <string>${apiServerPort ?? ''}</string>
  </dict>
  <key>StandardOutPath</key>
  <string>${logDir}/gateway.log</string>
  <key>StandardErrorPath</key>
  <string>${logDir}/gateway.error.log</string>
  <key>WorkingDirectory</key>
  <string>${home}</string>
  <key>RunAtLoad</key>
  <false/>
</dict>
</plist>
`;
}

export function parseRunning(stdout: string): boolean {
  const stateMatch = stdout.match(/state\s*=\s*(\S+)/);
  return stateMatch ? stateMatch[1] === 'running' : false;
}

export function parsePid(stdout: string): number | null {
  const m = stdout.match(/^\s*pid\s*=\s*(\d+)/m);
  return m ? Number(m[1]) : null;
}

export function isServiceMissing(result: ExecResult): boolean {
  if (result.code === 0) {
    return false;
  }

  const combined = `${result.stdout}\n${result.stderr}`;
  return /Could not find service/i.test(combined);
}
