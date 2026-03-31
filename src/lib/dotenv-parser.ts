import fs from 'node:fs/promises';

export function parse(content: string): { key: string; value: string }[] {
  const out: { key: string; value: string }[] = [];
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const k = line.slice(0, idx).trim();
    let v = line.slice(idx + 1);
    v = v.replace(/^"|"$/g, '');
    out.push({ key: k, value: v });
  }
  return out;
}

export function serialize(entries: { key: string; value: string }[]): string {
  const lines = entries.map(({ key, value }) => `${key}=${escapeValue(value)}`);
  return lines.join('\n') + (lines.length ? '\n' : '');
}

export function upsert(entries: { key: string; value: string }[], key: string, value: string) {
  const map = new Map(entries.map((e) => [e.key, e.value]));
  map.set(key, value);
  return Array.from(map.entries()).map(([k, v]) => ({ key: k, value: v }));
}

export function deleteKey(entries: { key: string; value: string }[], key: string) {
  const map = new Map(entries.map((e) => [e.key, e.value]));
  map.delete(key);
  return Array.from(map.entries()).map(([k, v]) => ({ key: k, value: v }));
}

export async function clearTokenValues(envPath: string, keys: readonly string[]): Promise<void> {
  const content = await fs.readFile(envPath, 'utf-8');
  const entries = parse(content);
  const keySet = new Set(keys);
  const sanitizedEntries = entries.map((entry) =>
    keySet.has(entry.key) ? { ...entry, value: '' } : entry,
  );

  await fs.writeFile(envPath, serialize(sanitizedEntries), 'utf-8');
}

function escapeValue(val: string) {
  if (/[^A-Za-z0-9_./-]/.test(val)) {
    return JSON.stringify(val);
  }
  return val;
}
