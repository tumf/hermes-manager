#!/bin/bash

set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "usage: $0 <agent-env> <globals-env>" >&2
  exit 64
fi

agent_env="$1"
globals_env="$2"

export PATH="$HOME/.local/bin:$HOME/.bun/bin:$HOME/.cargo/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

if [ -f "$globals_env" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$globals_env"
  set +a
fi

if [ -f "$agent_env" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$agent_env"
  set +a
fi

exec "$(command -v hermes)" gateway
