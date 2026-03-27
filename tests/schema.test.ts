import { describe, it, expect } from 'vitest';
import { agents, envVars, skillLinks } from '../db/schema';

describe('schema', () => {
  it('agents table is defined', () => {
    expect(agents).toBeDefined();
  });
  it('envVars table is defined', () => {
    expect(envVars).toBeDefined();
  });
  it('skillLinks table is defined', () => {
    expect(skillLinks).toBeDefined();
  });
});
