# Add Linux systemd support — Design

## Premise

The repository currently has a deep launchd bias across API naming, unit generation, tests, specs, and hosting docs. The safest way to add Linux support is not to fork the UI or duplicate route logic, but to isolate supervisor-specific behavior behind a narrow adapter boundary.

## Goals

- Keep the current operator workflow and endpoint shape usable on macOS.
- Add Linux `systemd` support without changing the filesystem-based agent model.
- Preserve security rules already enforced by the project: zod validation, path traversal protection, and `execFile`-style command invocation.
- Minimize UI churn by keeping the existing start/stop/restart/status affordances.

## Non-Goals

- Generalized support for every init system
- Cross-host orchestration
- Log streaming from journald in this first change

## Proposed Architecture

### 1. Supervisor abstraction

Introduce a small service-manager module with:

- `detectServiceManager(): 'launchd' | 'systemd'`
- `renderAgentServiceDefinition(...)`
- `installAgentService(...)`
- `uninstallAgentService(...)`
- `startAgentService(...)`
- `stopAgentService(...)`
- `restartAgentService(...)`
- `getAgentServiceStatus(...)`

The route keeps request validation and agent lookup, then delegates to the resolved adapter.

### 2. Platform adapters

#### macOS / launchd adapter

Retains existing behavior:

- plist file path: `~/Library/LaunchAgents/ai.hermes.gateway.{agentId}.plist`
- bootstrap domain: `gui/{uid}`
- service definition format: plist
- restart strategy: keep the current reliable `launchctl kickstart -kp gui/{uid}/{label}` approach

#### Linux / systemd adapter

Adds a user-service based flow for parity with the current per-user launchd model.

Recommended defaults:

- unit directory: `~/.config/systemd/user/`
- unit name: `ai.hermes.gateway.{agentId}.service`
- control commands: `systemctl --user ...`
- daemon reload after install/uninstall
- enable at install time so service survives login/session restarts where user lingering is configured

Unit file semantics should preserve:

- `WorkingDirectory={agent.home}`
- `Environment=HERMES_HOME=...`
- conditional `Environment=API_SERVER_ENABLED=true` and `Environment=API_SERVER_PORT=...`
- execution through the existing `scripts/run-agent-gateway.sh` with agent and global env file arguments
- stdout/stderr append or file redirection strategy documented for Linux hosting expectations

### 3. API compatibility strategy

The existing route path `/api/launchd` is already consumed by the UI and specs.

For the first systemd-compatible change:

- keep `/api/launchd` as a compatibility route
- document that it now means “local service supervisor control” even though the path is legacy-named
- optionally add response metadata such as `{ manager: 'launchd' | 'systemd' }` if helpful and non-breaking

A later cleanup can introduce `/api/service-manager` and leave `/api/launchd` as a compatibility alias.

### 4. Hosting artifacts

The webapp itself should gain Linux hosting material parallel to the existing macOS assets:

- a `systemd --user` service unit for the webapp, or a documented system-wide service variant if required
- README sections that distinguish macOS launchd setup from Linux systemd setup
- Linux log locations and restart instructions

### 5. Testing strategy

Tests should avoid requiring real launchd or systemd daemons by focusing on:

- platform detection behavior
- generated plist/unit file content
- command argument construction for `launchctl` vs `systemctl --user`
- route branching with mocked execution helpers

This keeps the default test suite fast and deterministic.

## Key Decisions and Trade-offs

### Keep endpoint compatibility instead of renaming immediately

Pros:

- avoids immediate UI and client churn
- keeps scope focused on runtime portability

Cons:

- `/api/launchd` becomes semantically imperfect on Linux

Decision:

- accept the naming debt for this change, document it, and defer neutral renaming to future work.

### Prefer user services over system-wide systemd units

Pros:

- maps more closely to the existing launchd-per-user model
- avoids requiring root for normal operation
- better matches project assumptions around local operator ownership of files under the repo home

Cons:

- depends on the user session and possibly `loginctl enable-linger` for full boot persistence

Decision:

- user services are the default target for the first implementation; documentation must call out lingering requirements where needed.

### Preserve existing shell runner script

Pros:

- avoids duplicating env-merging logic across platforms
- keeps agent startup semantics identical

Cons:

- unit files depend on `/bin/bash`

Decision:

- reuse the existing runner script and document `/bin/bash` as a Linux requirement.

## Risks

- Documentation drift if specs and requirements continue to say “launchd only” after implementation.
- Linux persistence confusion if systemd user lingering is not documented clearly.
- Hidden macOS regressions if launchd-specific logic is not covered by tests after refactoring.

## Mitigations

- Update docs/specs in the same change.
- Make tasks require unit tests for both adapters.
- Keep macOS artifact generation snapshots/assertions intact during refactor.
