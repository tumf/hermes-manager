# API Server Port

## Purpose

agent 作成・copy・起動連携で使う `apiServerPort` の割当と伝播を定義する。

## Requirements

### Requirement: Allocate apiServerPort on agent creation

The system SHALL allocate an unused API server port in the range `8642..8699` for each newly created agent.

#### Scenario: First available port is assigned

- GIVEN 使用済みポートが存在しない
- WHEN `POST /api/agents` で agent を作成する
- THEN `apiServerPort` として `8642` を割り当てる

#### Scenario: Lowest unused port is assigned

- GIVEN 既存 agent が `8642`, `8643` を使用している
- WHEN `POST /api/agents` で agent を作成する
- THEN `8644` を割り当てる

#### Scenario: Port range exhaustion

- GIVEN `8642..8699` が全て使用中である
- WHEN `POST /api/agents` を呼び出す
- THEN 409 を返す
- AND エラーは利用可能ポートがないことを示す

### Requirement: Allocate a fresh port on copy

The system SHALL not reuse the source agent's `apiServerPort` when copying an agent.

#### Scenario: Copy assigns a new port

- GIVEN コピー元 agent が存在する
- WHEN `POST /api/agents/copy` を実行する
- THEN コピー先 agent には未使用の新しい `apiServerPort` を割り当てる
- AND コピー元のポート値をそのまま引き継がない

#### Scenario: Copy fails when no port is available

- GIVEN 利用可能ポートが存在しない
- WHEN `POST /api/agents/copy` を実行する
- THEN 409 を返す

### Requirement: Inject api server env into launchd plist only when configured

The system SHALL include `API_SERVER_ENABLED` and `API_SERVER_PORT` in generated launchd plist only when `apiServerPort` is configured.

#### Scenario: Configured agent injects API server env

- GIVEN `apiServerPort` が `8645` の agent が存在する
- WHEN launchd plist を生成する
- THEN `HERMES_HOME` に加えて `API_SERVER_ENABLED=true` と `API_SERVER_PORT=8645` を含む

#### Scenario: Unconfigured agent omits API server env

- GIVEN `apiServerPort` が未設定である
- WHEN launchd plist を生成する
- THEN `API_SERVER_ENABLED` と `API_SERVER_PORT` を含めない
