import os from 'node:os';
import path from 'node:path';

import { describe, it, expect } from 'vitest';

import { systemdAdapter } from '@/src/lib/systemd-adapter';

describe('systemdAdapter.getServiceDefinitionPath', () => {
  it('returns path under ~/.config/systemd/user/', () => {
    const p = systemdAdapter.getServiceDefinitionPath('alpha');
    expect(p).toBe(
      path.join(os.homedir(), '.config', 'systemd', 'user', 'ai.hermes.gateway.alpha.service'),
    );
  });
});

describe('systemdAdapter.generateServiceDefinition', () => {
  const home = '/home/me/Hermes/alpha';
  const label = 'ai.hermes.gateway.alpha';

  it('contains the [Unit] section with label as description', async () => {
    const unit = await systemdAdapter.generateServiceDefinition('alpha', home, label, 8645);
    expect(unit).toContain('[Unit]');
    expect(unit).toContain(`Description=${label}`);
  });

  it('contains the [Service] section', async () => {
    const unit = await systemdAdapter.generateServiceDefinition('alpha', home, label, 8645);
    expect(unit).toContain('[Service]');
    expect(unit).toContain('Type=simple');
  });

  it('sets ExecStart with bash and runner script', async () => {
    const unit = await systemdAdapter.generateServiceDefinition('alpha', home, label, 8645);
    expect(unit).toContain('ExecStart=/bin/bash');
    expect(unit).toContain('scripts/run-agent-gateway.sh');
  });

  it('sets WorkingDirectory to home', async () => {
    const unit = await systemdAdapter.generateServiceDefinition('alpha', home, label, 8645);
    expect(unit).toContain(`WorkingDirectory=${home}`);
  });

  it('sets HERMES_HOME environment variable', async () => {
    const unit = await systemdAdapter.generateServiceDefinition('alpha', home, label, 8645);
    expect(unit).toContain(`Environment=HERMES_HOME=${home}`);
  });

  it('sets HERMES_MANAGER_BASE_URL environment variable', async () => {
    const unit = await systemdAdapter.generateServiceDefinition('alpha', home, label, 8645);
    expect(unit).toContain('Environment=HERMES_MANAGER_BASE_URL=');
  });

  it('injects API_SERVER_ENABLED and API_SERVER_PORT when configured', async () => {
    const unit = await systemdAdapter.generateServiceDefinition('alpha', home, label, 8645);
    expect(unit).toContain('Environment=API_SERVER_ENABLED=true');
    expect(unit).toContain('Environment=API_SERVER_PORT=8645');
  });

  it('does not inject API_SERVER vars when apiServerPort is null', async () => {
    const unitWithoutApi = await systemdAdapter.generateServiceDefinition(
      'alpha',
      home,
      label,
      null,
    );
    expect(unitWithoutApi).not.toContain('API_SERVER_ENABLED');
    expect(unitWithoutApi).not.toContain('API_SERVER_PORT');
  });

  it('sets stdout and stderr log paths', async () => {
    const unit = await systemdAdapter.generateServiceDefinition('alpha', home, label, 8645);
    expect(unit).toContain(`StandardOutput=append:${home}/logs/gateway.log`);
    expect(unit).toContain(`StandardError=append:${home}/logs/gateway.error.log`);
  });

  it('references the agent .env file', async () => {
    const unit = await systemdAdapter.generateServiceDefinition('alpha', home, label, 8645);
    expect(unit).toContain(`${home}/.env`);
  });

  it('references the globals .env file', async () => {
    const unit = await systemdAdapter.generateServiceDefinition('alpha', home, label, 8645);
    expect(unit).toContain(`${process.cwd()}/runtime/globals/.env`);
  });

  it('contains [Install] section with WantedBy', async () => {
    const unit = await systemdAdapter.generateServiceDefinition('alpha', home, label, 8645);
    expect(unit).toContain('[Install]');
    expect(unit).toContain('WantedBy=default.target');
  });
});

describe('systemdAdapter.parseRunning', () => {
  it('returns true for active (running) status', () => {
    const output = `● ai.hermes.gateway.alpha.service
     Loaded: loaded
     Active: active (running) since Mon 2026-01-01 00:00:00 UTC
   Main PID: 12345`;
    expect(systemdAdapter.parseRunning(output)).toBe(true);
  });

  it('returns false for inactive status', () => {
    const output = `● ai.hermes.gateway.alpha.service
     Active: inactive (dead)`;
    expect(systemdAdapter.parseRunning(output)).toBe(false);
  });

  it('returns false for empty output', () => {
    expect(systemdAdapter.parseRunning('')).toBe(false);
  });
});

describe('systemdAdapter.parsePid', () => {
  it('extracts PID from systemctl status output', () => {
    const output = `   Main PID: 12345 (bash)`;
    expect(systemdAdapter.parsePid(output)).toBe(12345);
  });

  it('returns null when no PID present', () => {
    expect(systemdAdapter.parsePid('Active: inactive (dead)')).toBeNull();
  });
});

describe('systemdAdapter.isServiceMissing', () => {
  it('returns true when unit not found', () => {
    expect(
      systemdAdapter.isServiceMissing({
        stdout: '',
        stderr: 'Unit ai.hermes.gateway.alpha.service could not be found.',
        code: 4,
      }),
    ).toBe(true);
  });

  it('returns false for successful result', () => {
    expect(systemdAdapter.isServiceMissing({ stdout: '', stderr: '', code: 0 })).toBe(false);
  });
});

describe('systemdAdapter command builders', () => {
  it('buildStartCommand uses systemctl --user start', () => {
    expect(systemdAdapter.buildStartCommand('ai.hermes.gateway.alpha.service')).toEqual([
      'systemctl',
      '--user',
      'start',
      'ai.hermes.gateway.alpha.service',
    ]);
  });

  it('buildStopCommand uses systemctl --user stop', () => {
    expect(systemdAdapter.buildStopCommand('ai.hermes.gateway.alpha.service')).toEqual([
      'systemctl',
      '--user',
      'stop',
      'ai.hermes.gateway.alpha.service',
    ]);
  });

  it('buildRestartCommand uses systemctl --user restart', () => {
    expect(systemdAdapter.buildRestartCommand('ai.hermes.gateway.alpha.service', 1000)).toEqual([
      'systemctl',
      '--user',
      'restart',
      'ai.hermes.gateway.alpha.service',
    ]);
  });

  it('buildStatusCommand uses systemctl --user show with explicit properties', () => {
    expect(systemdAdapter.buildStatusCommand('ai.hermes.gateway.alpha.service', 1000)).toEqual([
      'systemctl',
      '--user',
      'show',
      'ai.hermes.gateway.alpha.service',
      '--property=ActiveState',
      '--property=MainPID',
      '--no-pager',
    ]);
  });

  it('buildInstallCommands includes daemon-reload and enable', () => {
    const cmds = systemdAdapter.buildInstallCommands('alpha', 'ai.hermes.gateway.alpha');
    expect(cmds.bootstrap).toEqual(['systemctl', '--user', 'daemon-reload']);
    expect(cmds.post).toEqual([
      ['systemctl', '--user', 'enable', 'ai.hermes.gateway.alpha.service'],
    ]);
  });

  it('buildUninstallCommands includes disable and daemon-reload', () => {
    const cmds = systemdAdapter.buildUninstallCommands('alpha', 'ai.hermes.gateway.alpha');
    expect(cmds.pre).toEqual([
      ['systemctl', '--user', 'disable', 'ai.hermes.gateway.alpha.service'],
    ]);
    expect(cmds.remove).toEqual(['systemctl', '--user', 'daemon-reload']);
  });
});
