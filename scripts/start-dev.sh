#!/bin/bash
set -euo pipefail
PORT=${PORT:-18470}
NODE=/opt/homebrew/bin/node
NODE_ENV=development "$NODE" node_modules/.bin/next dev -p "$PORT" --hostname 0.0.0.0
