## MODIFIED Requirements

### Requirement: chat-tab-ui

エージェント詳細ページの Chat タブは、api_server の有効/無効に応じてストリーミングチャット UI またはガイダンスを表示する。

#### Scenario: global env で有効化済みだが gateway 再起動が必要

**Given**: global env に `API_SERVER_ENABLED=true` が設定されている
**And**: 対象エージェントの gateway はその設定をまだ反映していない
**When**: Chat タブを開く
**Then**: 「未設定」ではなく、設定済みだが gateway 再起動が必要である旨のガイダンスが表示される

#### Scenario: api_server 接続待ち状態

**Given**: api_server は有効化され gateway は running である
**And**: `gateway_state.json` の `platforms.api_server.state` は `connected` ではない
**When**: Chat タブを開く
**Then**: Chat はまだ利用できず、api_server の接続待ち状態であることが表示される

### Requirement: api-server-discovery

WebApp はエージェントの hermes gateway api_server の有効状態とポートを発見できる。

#### Scenario: 詳細状態を返す

**Given**: WebApp がエージェントの config、global/agent env、gateway_state.json を参照できる
**When**: api_server 状態判定ロジックを実行する
**Then**: 少なくとも `disabled` / `configured-needs-restart` / `starting` / `connected` / `error` を区別して返せる

#### Scenario: connected 状態でポート発見

**Given**: エージェントの api_server が connected でポートが利用可能である
**When**: api_server 状態判定ロジックを実行する
**Then**: 状態は `connected` となり、Chat API が利用するポート番号も取得できる
