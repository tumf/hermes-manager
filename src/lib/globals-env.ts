import fs from 'node:fs';
import path from 'node:path';

import { eq } from 'drizzle-orm';

import { db, schema } from './db';

export async function regenerateGlobalsEnv(): Promise<void> {
  const globalsDir = path.join(process.cwd(), 'globals');
  const globalsEnvFile = path.join(globalsDir, '.env');

  const rows = await db.select().from(schema.envVars).where(eq(schema.envVars.scope, 'global'));

  fs.mkdirSync(globalsDir, { recursive: true });

  const lines = rows.map((r) => `${r.key}=${r.value}`);
  fs.writeFileSync(globalsEnvFile, lines.join('\n') + (lines.length > 0 ? '\n' : ''), 'utf-8');
}
