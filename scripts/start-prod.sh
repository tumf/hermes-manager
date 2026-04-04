#!/bin/bash
set -euo pipefail
PORT=${PORT:-18470}

# launchd 環境では PATH が限定的なため必要な bin を明示する
export PATH="$HOME/.local/bin:$HOME/.bun/bin:$HOME/.cargo/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

# launchd 環境では PATH に node が含まれない場合があるため絶対パスを使う
NODE=/opt/homebrew/bin/node

NODE_ENV=production "$NODE" node_modules/.bin/next start -p "$PORT"
