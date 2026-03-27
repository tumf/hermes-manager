import os from 'node:os';
import path from 'node:path';

import { describe, it, expect } from 'vitest';

// --- plist generation (inline copy for unit testing) ---

function getPlistPath(name: string): string {
  return path.join(os.homedir(), 'Library', 'LaunchAgents', `ai.hermes.gateway.${name}.plist`);
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

// --- status parsing helper ---

function parseRunning(stdout: string): boolean {
  const stateMatch = stdout.match(/state\s*=\s*(\S+)/);
  return stateMatch ? stateMatch[1] === 'running' : false;
}

// --- tests ---

describe('getPlistPath', () => {
  it('returns correct path for agent name', () => {
    const p = getPlistPath('alpha');
    expect(p).toBe(
      path.join(os.homedir(), 'Library', 'LaunchAgents', 'ai.hermes.gateway.alpha.plist'),
    );
  });
});

describe('generatePlist', () => {
  const name = 'alpha';
  const home = '/Users/me/Hermes/alpha';
  const label = 'ai.hermes.gateway.alpha';
  const plist = generatePlist(name, home, label);

  it('contains the correct label', () => {
    expect(plist).toContain(`<string>${label}</string>`);
  });

  it('contains dotenvx as first ProgramArgument', () => {
    expect(plist).toContain('<string>dotenvx</string>');
  });

  it('contains hermes gateway in ProgramArguments', () => {
    expect(plist).toContain('<string>hermes</string>');
    expect(plist).toContain('<string>gateway</string>');
  });

  it('sets HERMES_HOME environment variable', () => {
    expect(plist).toContain('<key>HERMES_HOME</key>');
    expect(plist).toContain(`<string>${home}</string>`);
  });

  it('includes stdout log path', () => {
    expect(plist).toContain(`${home}/logs/gateway.log`);
  });

  it('includes stderr log path', () => {
    expect(plist).toContain(`${home}/logs/gateway.error.log`);
  });

  it('references the agent home .env file', () => {
    expect(plist).toContain(`${home}/.env`);
  });

  it('is valid XML with plist root element', () => {
    expect(plist).toContain('<?xml version="1.0"');
    expect(plist).toContain('<plist version="1.0">');
    expect(plist).toContain('</plist>');
  });
});

describe('parseRunning (status parsing)', () => {
  it('returns true when state = running', () => {
    const output = `{
  program = /usr/local/bin/hermes
  state = running
  pid = 12345
}`;
    expect(parseRunning(output)).toBe(true);
  });

  it('returns false when state = waiting', () => {
    const output = `{
  program = /usr/local/bin/hermes
  state = waiting
}`;
    expect(parseRunning(output)).toBe(false);
  });

  it('returns false when no state line present', () => {
    expect(parseRunning('')).toBe(false);
    expect(parseRunning('Could not find service')).toBe(false);
  });

  it('handles state with extra spaces', () => {
    const output = 'state   =   running';
    expect(parseRunning(output)).toBe(true);
  });
});
