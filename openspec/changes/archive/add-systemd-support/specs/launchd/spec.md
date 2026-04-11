## MODIFIED Requirements

### Requirement: local service lifecycle management API

Implement a server-side API to manage local OS service supervisors associated with Hermes agents.

- Endpoint: `POST /api/launchd` (legacy path retained for compatibility)
- Request body: `{ agent: string, action: 'install'|'uninstall'|'start'|'stop'|'restart'|'status' }`
- Execution: Use `child_process.execFile` for all system calls (no shell injection)
- Agent resolution: look up the agent in the filesystem-backed runtime model to obtain `home` and service label/unit name
- On macOS, the implementation uses `launchctl`, plist generation, and `~/Library/LaunchAgents`
- On Linux, the implementation uses `systemctl --user`, systemd user-unit generation, and the per-user unit directory
- Agent service definitions on both platforms preserve `HERMES_HOME`, working directory, stdout/stderr log destinations, and optional `API_SERVER_ENABLED` / `API_SERVER_PORT`

#### Scenario: install-action-uses-launchd-on-macos

**Given**: the server is running on macOS and an existing agent `alpha` is resolvable
**When**: `POST /api/launchd` is called with `{ "agent": "alpha", "action": "install" }`
**Then**: the server writes a plist file at the launchd agent path
**And**: it invokes `launchctl bootstrap` via `execFile`

#### Scenario: install-action-uses-systemd-on-linux

**Given**: the server is running on Linux and an existing agent `alpha` is resolvable
**When**: `POST /api/launchd` is called with `{ "agent": "alpha", "action": "install" }`
**Then**: the server writes a systemd user unit file for `ai.hermes.gateway.alpha.service`
**And**: it invokes `systemctl --user daemon-reload`
**And**: it enables or otherwise registers the unit according to the documented Linux flow via `execFile`

#### Scenario: start-stop-restart-status-use-active-supervisor

**Given**: the server is running on a supported operating system and an agent service is installed
**When**: `POST /api/launchd` is called with any of `start`, `stop`, `restart`, or `status`
**Then**: the server uses the active local supervisor for command execution
**And**: it returns supervisor output plus a normalized running status
