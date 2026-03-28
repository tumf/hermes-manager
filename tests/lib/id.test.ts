import { describe, expect, it } from 'vitest';

import { generateAgentId } from '../../src/lib/id';

describe('generateAgentId', () => {
  it('returns a 7-character string', () => {
    const id = generateAgentId();
    expect(id).toHaveLength(7);
  });

  it('contains only [0-9a-z] characters', () => {
    for (let i = 0; i < 50; i++) {
      const id = generateAgentId();
      expect(id).toMatch(/^[0-9a-z]{7}$/);
    }
  });

  it('generates unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateAgentId());
    }
    // With 36^7 possibilities, 100 IDs should all be unique
    expect(ids.size).toBe(100);
  });
});
