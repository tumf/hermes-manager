import os from 'node:os';
import path from 'node:path';

import { describe, it, expect } from 'vitest';

import { generatePlist, getPlistPath, isServiceMissing, parseRunning } from '@/src/lib/launchd';

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
  const plist = generatePlist(name, home, label, 8645);

  it('contains the correct label', () => {
    expect(plist).toContain(`<string>${label}</string>`);
  });

  it('contains bash as first ProgramArgument', () => {
    expect(plist).toContain('<string>/bin/bash</string>');
  });

  it('contains gateway runner script in ProgramArguments', () => {
    expect(plist).toContain(`${process.cwd()}/scripts/run-agent-gateway.sh`);
  });

  it('sets HERMES_HOME environment variable', () => {
    expect(plist).toContain('<key>HERMES_HOME</key>');
    expect(plist).toContain(`<string>${home}</string>`);
  });

  it('injects API_SERVER_ENABLED and API_SERVER_PORT environment variables', () => {
    expect(plist).toContain('<key>API_SERVER_ENABLED</key>');
    expect(plist).toContain('<string>true</string>');
    expect(plist).toContain('<key>API_SERVER_PORT</key>');
    expect(plist).toContain('<string>8645</string>');
  });

  it('sets WorkingDirectory to HERMES_HOME', () => {
    expect(plist).toContain('<key>WorkingDirectory</key>');
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

  it('references the globals .env file', () => {
    expect(plist).toContain(`${process.cwd()}/runtime/globals/.env`);
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

describe('isServiceMissing', () => {
  it('returns true when launchctl reports missing service on stdout', () => {
    expect(
      isServiceMissing({
        stdout: 'Bad request.\nCould not find service "ai.hermes.gateway.alpha" in domain',
        stderr: '',
        code: 3,
      }),
    ).toBe(true);
  });

  it('returns true when launchctl reports missing service on stderr', () => {
    expect(
      isServiceMissing({
        stdout: '',
        stderr: 'Could not find service "ai.hermes.gateway.alpha"',
        code: 1,
      }),
    ).toBe(true);
  });

  it('returns false for successful or unrelated failures', () => {
    expect(isServiceMissing({ stdout: '', stderr: '', code: 0 })).toBe(false);
    expect(
      isServiceMissing({ stdout: '', stderr: 'Bootstrap failed: 5: Input/output error', code: 5 }),
    ).toBe(false);
  });
});
