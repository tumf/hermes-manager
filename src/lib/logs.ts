import fs from 'node:fs/promises';
import path from 'node:path';

import { z } from 'zod';

export const ALLOWED_LOG_FILES = ['gateway.log', 'gateway.error.log', 'errors.log'] as const;

export const LogQuerySchema = z.object({
  agent: z.string().min(1),
  file: z.enum(ALLOWED_LOG_FILES),
  lines: z.coerce.number().int().min(1).max(1000).optional().default(200),
});

const CHUNK_SIZE = 64 * 1024; // 64 KB reverse-scan buffer

/**
 * Reads the last N lines from a file using a reverse-scan buffer strategy.
 * Returns { lines, totalBytes } where totalBytes is the file size.
 * If the file does not exist, returns { lines: [], totalBytes: 0 }.
 */
export async function readLastNLines(
  filePath: string,
  n: number,
): Promise<{ lines: string[]; totalBytes: number }> {
  let stat: { size: number };
  try {
    stat = await fs.stat(filePath);
  } catch {
    return { lines: [], totalBytes: 0 };
  }

  const totalBytes = stat.size;
  if (totalBytes === 0) {
    return { lines: [], totalBytes: 0 };
  }

  const fileHandle = await fs.open(filePath, 'r');
  try {
    const collected: string[] = [];
    let remaining = '';
    let position = totalBytes;

    while (position > 0 && collected.length < n) {
      const readSize = Math.min(CHUNK_SIZE, position);
      position -= readSize;

      const buf = Buffer.alloc(readSize);
      await fileHandle.read(buf, 0, readSize, position);
      const chunk = buf.toString('utf8') + remaining;

      const parts = chunk.split('\n');
      // The first element may be a partial line; keep it for next iteration
      remaining = parts[0];

      // Process complete lines from the end
      for (let i = parts.length - 1; i >= 1; i--) {
        const line = parts[i];
        // Skip trailing empty line from final newline
        if (line === '' && i === parts.length - 1 && position + readSize === totalBytes) {
          continue;
        }
        collected.unshift(line);
        if (collected.length >= n) break;
      }
    }

    // Include the remaining partial line at the start if we still need lines
    if (collected.length < n && remaining !== '') {
      collected.unshift(remaining);
    }

    return { lines: collected.slice(-n), totalBytes };
  } finally {
    await fileHandle.close();
  }
}

/**
 * Resolves the log file path given agent home and file name.
 */
export function resolveLogPath(agentHome: string, file: string): string {
  return path.join(agentHome, 'logs', file);
}
