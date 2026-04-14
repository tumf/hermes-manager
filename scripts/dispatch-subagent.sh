#!/bin/bash

set -euo pipefail

if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
  echo "usage: $0 <target-agent-id> [message-file]" >&2
  exit 64
fi

target_agent="$1"
message_file="${2:-}"

if [ -z "${HERMES_HOME:-}" ]; then
  echo "HERMES_HOME is not set" >&2
  exit 66
fi

source_agent_id="$(basename -- "$HERMES_HOME")"
manager_base_url="${HERMES_MANAGER_BASE_URL:-http://127.0.0.1:18470}"
dispatch_url="${manager_base_url}/api/agents/${source_agent_id}/dispatch"

if [ -n "$message_file" ]; then
  message="$(cat "$message_file")"
else
  message="$(cat)"
fi

json_payload="$(python3 - "$target_agent" "$message" "$source_agent_id" <<'PY'
import json
import sys

target_agent = sys.argv[1]
message = sys.argv[2]
source_agent_id = sys.argv[3]

print(json.dumps({
    "targetAgent": target_agent,
    "message": message,
    "dispatchPath": [source_agent_id],
    "hopCount": 0,
}, ensure_ascii=False))
PY
)"

exec curl -sS -N -X POST "$dispatch_url" \
  -H 'Content-Type: application/json' \
  --data-binary "$json_payload"
