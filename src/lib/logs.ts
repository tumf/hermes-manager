import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

export const ALLOWED_LOG_FILES = z.enum(['gateway.log', 'gateway.error.log', 'errors.log']);

export const LogQuerySchema = z.object({
  agent: z.string().min(1),
  file: ALLOWED_LOG_FILES.default('gateway.log'),
  lines: z.coerce.number().min(1).max(1000).default(200),
});

export function resolveLogPath(agentHome: string, file: string) {
  return path.join(agentHome, 'logs', file);
}

export async function readLastNLines(
  filePath: string,
  n: number,
): Promise<{ lines: string[]; totalBytes: number }> {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    const lines = data.split(/\r?\n/);
    if (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop();
    }
    return { lines: lines.slice(-n), totalBytes: Buffer.byteLength(data, 'utf8') };
  } catch {
    return { lines: [], totalBytes: 0 };
  }
}
