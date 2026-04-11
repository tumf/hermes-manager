# Hosting Setup Spec

## Requirements

### Requirement: launchd service keeps webapp running persistently

The project MUST include a launchd plist that starts the webapp automatically at
login and restarts it if it exits, using PORT=18470 and NODE_ENV=production.

#### Scenario: Service starts on login

Given the plist is installed via launchctl bootstrap,
When the user logs in,
Then the webapp process starts on port 18470 automatically.

#### Scenario: Log files written to correct paths

Given the plist is loaded and the webapp is running,
When the process writes to stdout or stderr,
Then output appears in runtime/logs/webapp.log and runtime/logs/webapp.error.log respectively.

### Requirement: Caddy snippet routes public subdomain

The project MUST include a Caddy configuration snippet that routes
hermes-agents.mini.tumf.dev to localhost:18470 with HTTPS termination.

#### Scenario: Public domain resolves to webapp

Given the snippet is included in the active Caddyfile and Caddy is reloaded,
When an HTTPS request is made to hermes-agents.mini.tumf.dev,
Then Caddy reverse proxies to localhost:18470.

### Requirement: Production start script runs server on the fixed port

The `npm run start:prod` script MUST start the Next.js server on `PORT=18470`
using the filesystem-based runtime layout already prepared for the application.
It MUST NOT require or imply database migrations from a previous architecture.

#### Scenario: Fresh runtime starts without database setup

Given the repository is cloned and dependencies are installed,
And the runtime directories are prepared via `.wt/setup` or equivalent,
When `npm run start:prod` is executed,
Then the Next.js server starts on `PORT=18470` without any database migration step.

#### Scenario: Hosting docs match production start behavior

Given a maintainer reads the hosting documentation,
When they review the production start instructions,
Then the docs describe the filesystem-based runtime behavior accurately
And they do not mention database migrations on startup.

### Requirement: persistent local service hosting keeps webapp running

The project MUST include local-service hosting artifacts that keep the webapp running persistently on supported operating systems.

- On macOS, the repository must provide a launchd plist that starts the webapp automatically at login and restarts it if it exits, using `PORT=18470` and `NODE_ENV=production`.
- On Linux, the repository must provide a systemd service definition and installation instructions that start the webapp persistently with the same port and environment semantics.

#### Scenario: macos-hosting-service-starts-on-login

**Given**: the macOS launchd plist is installed via `launchctl bootstrap`
**When**: the user logs in
**Then**: the webapp process starts on port 18470 automatically

#### Scenario: linux-hosting-service-starts-via-systemd

**Given**: the Linux systemd unit is installed according to the repository instructions
**When**: the operator enables and starts the service
**Then**: the webapp process starts on port 18470 using `NODE_ENV=production`

#### Scenario: service-logs-are-documented-per-platform

**Given**: a supported hosting artifact is installed and the webapp is running
**When**: the process writes stdout or stderr
**Then**: the repository documentation identifies the corresponding log destinations for that platform

### Requirement: Production start script runs server on the fixed port

`npm run start:prod` は、現在のファイルシステムベース構成に必要な前提ディレクトリとログ出力先を利用して Next.js サーバーを `PORT=18470` で起動しなければならない。旧アーキテクチャ由来のデータベース migration 前提を要求してはならない。

#### Scenario: Fresh runtime starts without database setup

**Given**: リポジトリを新規 clone し、必要な Node 依存関係をインストール済みである
**And**: `runtime/logs/` などの実行時ディレクトリは存在しないか空である
**When**: `.wt/setup` の後に `npm run start:prod` を実行する
**Then**: データベース migration を要求せずに Next.js サーバーが `PORT=18470` で起動する

#### Scenario: Hosting documentation matches production start behavior

**Given**: メンテナーが `hosting/README.md` と hosting spec を確認している
**When**: `start:prod` の説明を読む
**Then**: 説明は filesystem-based runtime に整合し、DB migration の記述を含まない
