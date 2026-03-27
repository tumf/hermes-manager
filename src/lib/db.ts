import fs from 'node:fs';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../../db/schema';
import { ensureRuntimeDirectories, getRuntimeDataRootPath } from './runtime-paths';

ensureRuntimeDirectories();
const dataDir = getRuntimeDataRootPath();
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const sqlite = new Database(getRuntimeDataRootPath('app.db'));
export const db = drizzle(sqlite, { schema });
export * as schema from '../../db/schema';
