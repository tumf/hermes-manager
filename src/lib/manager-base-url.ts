import fs from 'node:fs/promises';

import { parse } from './dotenv-parser';
import { getRuntimeGlobalsRootPath } from './runtime-paths';

const DEFAULT_MANAGER_BASE_URL = 'http://127.0.0.1:18470';
const MANAGER_BASE_URL_KEY = 'HERMES_MANAGER_BASE_URL';

export async function resolveManagerBaseUrl(): Promise<string> {
  const envPath = getRuntimeGlobalsRootPath('.env');
  try {
    const content = await fs.readFile(envPath, 'utf-8');
    const entries = parse(content);
    const hit = entries.find((entry) => entry.key === MANAGER_BASE_URL_KEY)?.value.trim();
    return hit || DEFAULT_MANAGER_BASE_URL;
  } catch {
    return DEFAULT_MANAGER_BASE_URL;
  }
}
