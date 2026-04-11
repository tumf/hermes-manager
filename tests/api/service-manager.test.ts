import { describe, it, expect } from 'vitest';

import { detectServiceManager, getServiceAdapter } from '@/src/lib/service-manager';

describe('detectServiceManager', () => {
  it('returns systemd on linux', () => {
    expect(detectServiceManager('linux')).toBe('systemd');
  });

  it('returns launchd on darwin', () => {
    expect(detectServiceManager('darwin')).toBe('launchd');
  });

  it('returns launchd on other platforms', () => {
    expect(detectServiceManager('win32')).toBe('launchd');
    expect(detectServiceManager('freebsd')).toBe('launchd');
  });
});

describe('getServiceAdapter', () => {
  it('returns systemd adapter on linux', () => {
    const adapter = getServiceAdapter('linux');
    expect(adapter.type).toBe('systemd');
  });

  it('returns launchd adapter on darwin', () => {
    const adapter = getServiceAdapter('darwin');
    expect(adapter.type).toBe('launchd');
  });
});
