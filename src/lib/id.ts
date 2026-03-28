import crypto from 'node:crypto';

const ID_LENGTH = 7;
const CHARSET = '0123456789abcdefghijklmnopqrstuvwxyz'; // [0-9a-z]

/**
 * Generate a random agent ID of 7 characters from [0-9a-z].
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
