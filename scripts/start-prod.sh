#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

mkdir -p data logs

echo "Running DB migration..."
npx tsx scripts/migrate.ts

echo "Starting Next.js server..."
exec env PORT=18470 NODE_ENV=production node_modules/.bin/next start -p 18470
