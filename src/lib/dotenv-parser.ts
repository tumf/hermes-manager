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

export async function serialize(entries: { key: string; value: string }[]): Promise<string> {
  const lines = entries.map(({ key, value }) => `${key}=${escapeValue(value)}`);
  return lines.join('\n') + (lines.length ? '\n' : '');
}

export async function upsert(
  entries: { key: string; value: string }[],
  key: string,
  value: string,
) {
  const map = new Map(entries.map((e) => [e.key, e.value]));
  map.set(key, value);
  return Array.from(map.entries()).map(([k, v]) => ({ key: k, value: v }));
}

export async function deleteKey(entries: { key: string; value: string }[], key: string) {
  const map = new Map(entries.map((e) => [e.key, e.value]));
  map.delete(key);
  return Array.from(map.entries()).map(([k, v]) => ({ key: k, value: v }));
}

function escapeValue(val: string) {
  if (/[^A-Za-z0-9_./-]/.test(val)) {
    return JSON.stringify(val);
  }
  return val;
}
