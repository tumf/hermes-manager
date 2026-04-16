## Requirements

### Requirement: local service lifecycle management API

Implement a server-side API to manage local OS service supervisors associated with Hermes agents.

- Endpoint: POST /api/launchd (legacy path retained for compatibility)
- Request body: { agent: string, action: 'install'|'uninstall'|'start'|'stop'|'restart'|'status' }
- Execution: Use child_process.execFile for all system calls (no shell injection)
- Agent resolution: look up the agent in the filesystem-backed runtime model to obtain home and service label/unit name
- On macOS, the implementation uses launchctl, plist generation, and ~/Library/LaunchAgents
- On Linux, the implementation uses systemctl --user, systemd user-unit generation, and the per-user unit directory
- Agent service definitions on both platforms preserve HERMES_HOME, working directory, stdout/stderr log destinations, and optional API_SERVER_ENABLED / API_SERVER_PORT

#### Scenario: install-action-uses-launchd-on-macos

Given the server is running on macOS and an existing agent "alpha" is resolvable
When POST /api/launchd is called with { agent: "alpha", action: "install" }
Then the server writes a plist file at the launchd agent path
And it invokes launchctl bootstrap via execFile

#### Scenario: install-action-uses-systemd-on-linux

Given the server is running on Linux and an existing agent "alpha" is resolvable
When POST /api/launchd is called with { agent: "alpha", action: "install" }
Then the server writes a systemd user unit file for ai.hermes.gateway.alpha.service
And it invokes systemctl --user daemon-reload
And it enables or otherwise registers the unit according to the documented Linux flow via execFile

#### Scenario: start-stop-restart-status-use-active-supervisor

Given the server is running on a supported operating system and an agent service is installed
When POST /api/launchd is called with any of start, stop, restart, or status
Then the server uses the active local supervisor for command execution
And it returns supervisor output plus a normalized running status

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

### Requirement: local service lifecycle management API

macOS の launchd service lifecycle management は、初回 install/register と既登録 service の restart/reload を区別して扱わなければならない。既に登録済みの service を再起動する経路は、不要な `launchctl bootstrap` の再実行に依存してはならない。

#### Scenario: restart-does-not-require-rebootstrap-of-installed-service

**Given**: サーバーは macOS 上で動作しており、対象 agent service は既に launchd へ登録済みである
**When**: `POST /api/launchd` が restart 相当の既登録 service 再起動フローを実行する
**Then**: 実装は既登録 service を再起動するために不要な `launchctl bootstrap` の再実行を前提にしない
**And**: 既登録 service の再起動/再読込は install/register 手順とは別の操作として扱われる

### Requirement: local service lifecycle management API

macOS の launchd service lifecycle management は、初回 install/register と既登録 service の restart/reload を区別して扱わなければならない。既に登録済みの service を再起動する経路は、不要な `launchctl bootstrap` の再実行に依存してはならない。service definition を動的生成する場合でも、そのことは既登録 running service に対する無条件の unregister/register を正当化しない。

#### Scenario: restart-does-not-require-rebootstrap-of-installed-service

**Given**: サーバーは macOS 上で動作しており、対象 agent service は既に launchd へ登録済みである
**When**: `POST /api/launchd` が restart 相当の既登録 service 再起動フローを実行する
**Then**: 実装は既登録 service を再起動するために不要な `launchctl bootstrap` の再実行を前提にしない
**And**: 既登録 service の再起動/再読込は install/register 手順とは別の操作として扱われる

#### Scenario: restart-failure-does-not-drop-previously-running-service-due-to-rebootstrap-attempt

**Given**: サーバーは macOS 上で動作しており、対象 agent service は launchd に登録済みかつ running である
**When**: `POST /api/launchd` が restart を試みる
**Then**: 実装は restart のためだけに先に service を unbootstrap しない
**And**: re-bootstrap 失敗のみを理由に、直前まで running だった service を停止したまま残す挙動を導入しない

## Requirements

### Requirement: Batch status endpoint for agent services

トップページや fleet-oriented UI は、複数 agent の service status を 1 回の API 呼び出しで取得できなければならない。既存の単体 `/api/launchd` action API を壊さず、複数 agent の status 問い合わせをまとめて返せる batch endpoint を提供する。

#### Scenario: Batch status request returns multiple agent statuses

**Given**: `alpha11` と `beta222` の 2 つの agent が存在する
**When**: `POST /api/launchd/statuses` に `{ "agents": ["alpha11", "beta222"] }` を送信する
**Then**: レスポンスは agent ごとの status 要素を返す
**And**: 各要素には少なくとも agent, running, pid, code, manager が含まれる

#### Scenario: Missing agent does not fail the whole batch response

**Given**: `alpha11` は存在し、`ghost999` は存在しない
**When**: `POST /api/launchd/statuses` に `{ "agents": ["alpha11", "ghost999"] }` を送信する
**Then**: API は batch 全体を 200 系で返せる
**And**: `ghost999` の要素には not found を示す error が含まれる
**And**: `alpha11` の status 要素は引き続き返される
