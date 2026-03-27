import os from 'node:os';
import path from 'node:path';

export interface ExecResult {
  stdout: string;
  stderr: string;
  code: number;
}

export function getPlistPath(name: string): string {
  return path.join(os.homedir(), 'Library', 'LaunchAgents', `ai.hermes.gateway.${name}.plist`);
}

export function generatePlist(_name: string, home: string, label: string): string {
  const runnerScriptPath = path.join(process.cwd(), 'scripts', 'run-agent-gateway.sh');
  const globalsEnvPath = path.join(process.cwd(), 'globals', '.env');
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

export function parseRunning(stdout: string): boolean {
  const stateMatch = stdout.match(/state\s*=\s*(\S+)/);
  return stateMatch ? stateMatch[1] === 'running' : false;
}

export function isServiceMissing(result: ExecResult): boolean {
  if (result.code === 0) {
    return false;
  }

  const combined = `${result.stdout}\n${result.stderr}`;
  return /Could not find service/i.test(combined);
}
