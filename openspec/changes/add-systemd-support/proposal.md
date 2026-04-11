---
change_type: implementation
priority: high
dependencies: []
references:
  - app/api/launchd/route.ts
  - src/lib/launchd.ts
  - tests/api/launchd.test.ts
  - hosting/README.md
  - hosting/ai.hermes.agents-webapp.plist
  - docs/requirements.md
  - docs/design.md
---

# Add Linux systemd support

**Change Type**: implementation

## Problem / Context

The current project assumes a macOS-only operating environment:

- requirements and design documents explicitly list macOS launchd as an operating constraint
- the agent lifecycle API is hard-wired to `launchctl`, plist generation, and `~/Library/LaunchAgents`
- the hosting documentation and bundled deployment artifacts only cover launchd for the webapp itself
- Linux operators therefore cannot use the same Web UI and API surface to manage Hermes agents under `systemd`

This prevents the project from being portable to common Linux hosts while preserving the current mini/macOS workflow.

## Proposed Solution

Add first-class Linux `systemd` support while keeping existing macOS `launchd` behavior intact.

The change will:

1. Introduce a service-manager abstraction that resolves the active supervisor (`launchd` on macOS, `systemd` on Linux) from runtime platform information.
2. Extend the current agent lifecycle implementation so install/start/stop/restart/status work through platform-specific adapters instead of directly calling `launchctl`.
3. Generate Linux unit files for Hermes agents with the same environment, log, working-directory, and api_server semantics currently expressed in plist generation.
4. Add hosting artifacts and documentation for running the webapp itself under `systemd` on Linux.
5. Update requirements/design/specs so cross-platform service management is explicit and testable.

## Acceptance Criteria

- On macOS, existing `/api/launchd` behavior remains backward compatible for agent install/start/stop/restart/status.
- On Linux, the same API endpoint successfully manages Hermes agents through `systemd` unit files and `systemctl` commands.
- Agent service definitions on both platforms preserve `HERMES_HOME`, optional `API_SERVER_ENABLED=true`, `API_SERVER_PORT`, working directory, and log destinations.
- The repository includes Linux hosting artifacts and instructions for running the webapp persistently under `systemd`.
- Tests cover platform selection, service-definition generation, and command construction for both macOS and Linux.
- Requirements and design docs no longer claim the product is launchd-only or macOS-only when Linux support is enabled.

## Out of Scope

- Supporting non-systemd Linux init systems such as OpenRC, runit, or supervisord
- Supporting Windows service management
- Adding remote host orchestration; control remains limited to the local host running the webapp
