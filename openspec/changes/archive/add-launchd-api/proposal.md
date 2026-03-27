# Add launchd Lifecycle Management API

**Change Type**: implementation

## Problem / Context

The hermes-agents webapp manages Hermes gateway agents that run as macOS launchd services.
Currently there is no programmatic interface for installing, uninstalling, starting, stopping,
or querying the status of these launchd services from the web UI. Operators must manually
run `launchctl` commands from the terminal, which is error-prone and inconvenient.

## Proposed Solution

Introduce a single `POST /api/launchd` endpoint that accepts an agent name and an action
(`install`, `uninstall`, `start`, `stop`, `status`) and delegates to the appropriate
`launchctl` subcommand via `child_process.execFile` (no shell-injection risk).

The `install` action writes a correctly-structured `.plist` file to
`~/Library/LaunchAgents/ai.hermes.gateway.{name}.plist` and then bootstraps it into
`gui/{uid}`. The `uninstall` action reverses this. `start` / `stop` control a running
service. `status` parses `launchctl print` output and returns a structured `{running, output}`
response alongside the raw `{stdout, stderr, code}` envelope.

All operations return a uniform `{stdout, stderr, code}` JSON response so callers can
surface error output in the UI.

## Acceptance Criteria

1. `POST /api/launchd` with `action: "install"` creates the plist and bootstraps the service.
2. `POST /api/launchd` with `action: "uninstall"` boots the service out and removes the plist.
3. `POST /api/launchd` with `action: "start"` / `"stop"` controls a running service.
4. `POST /api/launchd` with `action: "status"` returns `{running: bool, output: string, stdout, stderr, code}`.
5. All `launchctl` / `launchd`-related invocations use `child_process.execFile` (no shell string).
6. Zod schema validates the request body; invalid requests return HTTP 400.
7. The agent record is looked up from the SQLite database to resolve `home` and `label`.

## Out of Scope

- UI components (buttons / status badges) — those are a separate UI change.
- Cross-platform support (Linux systemd) — macOS only.
- Authentication / authorization — this is an intranet-only application.
