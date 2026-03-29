import fsp from 'node:fs/promises';
import path from 'node:path';

export type Visibility = 'plain' | 'secure';

export interface EnvMeta {
  [key: string]: { visibility: Visibility };
}

/**
 * Read .env.meta.json from a directory.
 * Returns an empty object if the file doesn't exist or is invalid.
 */
export async function readEnvMeta(dir: string): Promise<EnvMeta> {
  const metaPath = path.join(dir, '.env.meta.json');
  try {
    const content = await fsp.readFile(metaPath, 'utf-8');
    const parsed = JSON.parse(content);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as EnvMeta;
    }
    return {};
  } catch {
    return {};
  }
}

/**
 * Write .env.meta.json to a directory.
 * Uses atomic write (write to tmp then rename).
 */
export async function writeEnvMeta(dir: string, meta: EnvMeta): Promise<void> {
  const metaPath = path.join(dir, '.env.meta.json');
  const tmpPath = metaPath + '.tmp';
  await fsp.mkdir(dir, { recursive: true });
  await fsp.writeFile(tmpPath, JSON.stringify(meta, null, 2) + '\n', 'utf-8');
  await fsp.rename(tmpPath, metaPath);
}

/**
 * Get visibility for a single key. Returns 'plain' if not found.
 */
export function getVisibility(meta: EnvMeta, key: string): Visibility {
  return meta[key]?.visibility === 'secure' ? 'secure' : 'plain';
}

/**
 * Set visibility for a single key and persist.
 */
export async function setVisibility(
  dir: string,
  key: string,
  visibility: Visibility,
): Promise<void> {
  const meta = await readEnvMeta(dir);
  meta[key] = { visibility };
  await writeEnvMeta(dir, meta);
}

/**
 * Remove visibility metadata for a key and persist.
 */
export async function removeVisibility(dir: string, key: string): Promise<void> {
  const meta = await readEnvMeta(dir);
  delete meta[key];
  await writeEnvMeta(dir, meta);
}

/**
 * Build a Map<key, visibility> from env meta.
 */
export function buildVisibilityMap(meta: EnvMeta): Map<string, Visibility> {
  const map = new Map<string, Visibility>();
  for (const [key, val] of Object.entries(meta)) {
    map.set(key, val?.visibility === 'secure' ? 'secure' : 'plain');
  }
  return map;
}
