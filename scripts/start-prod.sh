#!/bin/bash
set -euo pipefail
PORT=${PORT:-18470}

# launchd 環境では PATH に node が含まれないため絶対パスを使う
NODE=/opt/homebrew/bin/node

NODE_ENV=production "$NODE" node_modules/.bin/next start -p "$PORT"
