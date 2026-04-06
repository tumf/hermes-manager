## ADDED Requirements

### Requirement: api-server-port-auto-assignment

エージェント作成時に api_server 用のポートを自動採番し meta.json に保存する。

#### Scenario: 新規エージェント作成でポートが自動割当される

**Given**: runtime/agents/ に 0 個のエージェントが存在する
**When**: `POST /api/agents` でエージェントを作成する
**Then**: meta.json に `apiServerPort: 8642` が保存される

#### Scenario: 既存エージェントとポートが競合しない

**Given**: 既存エージェントが apiServerPort 8642, 8643 を使用中
**When**: `POST /api/agents` でエージェントを作成する
**Then**: meta.json に `apiServerPort: 8644` が保存される

#### Scenario: ポート範囲が枯渇した場合

**Given**: 8642〜8699 の全ポートが使用中
**When**: `POST /api/agents` でエージェントを作成する
**Then**: エラーレスポンスが返される

### Requirement: launchd-api-server-env-injection

launchd plist 生成時に api_server 環境変数を注入する。

#### Scenario: install 時に plist へ環境変数が注入される

**Given**: エージェントの meta.json に `apiServerPort: 8645` が存在する
**When**: `POST /api/launchd` で `action: "install"` を実行する
**Then**: 生成される plist の EnvironmentVariables に `API_SERVER_ENABLED=true` と `API_SERVER_PORT=8645` が含まれる

#### Scenario: apiServerPort が未設定のエージェント

**Given**: エージェントの meta.json に `apiServerPort` が存在しない
**When**: `POST /api/launchd` で `action: "install"` を実行する
**Then**: plist に `API_SERVER_ENABLED` と `API_SERVER_PORT` は含まれない
