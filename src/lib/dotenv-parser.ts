export interface EnvEntry {
  key: string;
  value: string;
}

/**
 * Parse .env file content into key-value entries.
 * Comment lines (starting with #) and blank lines are skipped.
 */
export function parse(content: string): EnvEntry[] {
  const entries: EnvEntry[] = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1);
    if (key) entries.push({ key, value });
  }
  return entries;
}

/**
 * Serialize key-value entries to .env file content.
 * Comments are stripped on write.
 */
export function serialize(entries: EnvEntry[]): string {
  if (entries.length === 0) return '';
  return entries.map((e) => `${e.key}=${e.value}`).join('\n') + '\n';
}

/**
 * Upsert a key: add if absent, update value if present.
 */
export function upsert(entries: EnvEntry[], key: string, value: string): EnvEntry[] {
  const idx = entries.findIndex((e) => e.key === key);
  if (idx === -1) return [...entries, { key, value }];
  return entries.map((e, i) => (i === idx ? { key, value } : e));
}

/**
 * Remove a key from entries (no-op if key not found).
 */
export function deleteKey(entries: EnvEntry[], key: string): EnvEntry[] {
  return entries.filter((e) => e.key !== key);
}
