import crypto from 'node:crypto';

const ID_LENGTH = 7;
const CHARSET = '34679ACDEFGHJKMNPQRTUVWXY';

/**
 * Generate a random agent ID of 7 characters from an ambiguity-free charset.
 * Excluded: 0/o (zero/oh), 1/i/l (one/eye/ell), 2/z, 5/s, 8/b.
 * Uses crypto.randomBytes for uniform distribution.
 */
export function generateAgentId(): string {
  const bytes = crypto.randomBytes(ID_LENGTH);
  let id = '';
  for (let i = 0; i < ID_LENGTH; i++) {
    id += CHARSET[bytes[i] % CHARSET.length];
  }
  return id;
}
