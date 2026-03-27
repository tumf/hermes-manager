#!/usr/bin/env bash
set -euo pipefail
PORT=${PORT:-18470}

node scripts/migrate.js
NODE_ENV=production next start -p "$PORT"
