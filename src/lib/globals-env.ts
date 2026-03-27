import fs from 'node:fs/promises';

import { eq } from 'drizzle-orm';

import { db, schema } from './db';
import { getRuntimeGlobalsRootPath } from './runtime-paths';

export async function regenerateGlobalsEnv() {
  const rows = await db.select().from(schema.envVars).where(eq(schema.envVars.scope, 'global'));
  const lines = rows.map((r) => `${r.key}=${escapeValue(r.value)}`);
  const dir = getRuntimeGlobalsRootPath();
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    getRuntimeGlobalsRootPath('.env'),
    lines.join('\n') + (lines.length ? '\n' : ''),
    'utf8',
  );
}

function escapeValue(val: string) {
  if (/[^A-Za-z0-9_./-]/.test(val)) {
    return JSON.stringify(val);
  }
  return val;
}
