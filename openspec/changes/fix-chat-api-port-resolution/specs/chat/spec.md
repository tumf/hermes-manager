## MODIFIED Requirements

### Requirement: api-server-discovery

WebApp はエージェントの hermes gateway api_server の有効状態とポートを、`gateway_state.json` の実測値を優先しつつ、割当済み `meta.json.apiServerPort` と整合する形で発見できなければならない。

#### Scenario: gateway state に port がなくても meta.json から解決できる

**Given**: エージェントの `config.yaml` で api_server が有効で gateway は running である
**And**: `gateway_state.json.platforms.api_server.state` は `connected` である
**And**: `gateway_state.json.api_server_port` は存在しない
**And**: `meta.json.apiServerPort` は `8645` である
**When**: api_server 状態判定ロジックを実行する
**Then**: 状態は `connected` となり、返されるポートは `8645` になる

#### Scenario: どこにも妥当な port がなければ connected にしない

**Given**: エージェントの `config.yaml` で api_server が有効で gateway は running である
**And**: `gateway_state.json.platforms.api_server.state` は `connected` である
**And**: `gateway_state.json.api_server_port` は不正値である
**And**: `meta.json.apiServerPort` は存在しない
**And**: `.env` にも妥当な `API_SERVER_PORT` は存在しない
**When**: api_server 状態判定ロジックを実行する
**Then**: 状態は `error` となる
**And**: ポートは `null` になる
**And**: 8642 は暗黙に採用されない

### Requirement: chat-api

WebApp は hermes gateway の api_server プラットフォームへ、状態判定で解決した正しい localhost ポートだけを使って SSE ストリーミング接続しなければならない。

#### Scenario: meta.json fallback で解決した port に接続する

**Given**: エージェント `agent-1` の api_server は connected である
**And**: `gateway_state.json.api_server_port` は存在しない
**And**: `meta.json.apiServerPort` は `19001` である
**When**: `POST /api/agents/agent-1/chat` に `{ "message": "hello" }` を送信する
**Then**: WebApp は `http://127.0.0.1:19001/v1/chat/completions` に接続する

#### Scenario: port 未確定時は upstream に接続しない

**Given**: エージェント `agent-1` の api_server 状態判定結果が `error` で port は `null` である
**When**: `POST /api/agents/agent-1/chat` に `{ "message": "hello" }` を送信する
**Then**: `503 { "error": "api_server not available" }` が返る
**And**: WebApp は localhost の任意ポートへ upstream 接続しない

### Requirement: chat-tab-ui

エージェント詳細ページの Chat タブは、api_server の自動割当・launchd 注入前提と整合するガイダンスを表示しなければならない。

#### Scenario: 無効時のガイダンスが自動割当前提になる

**Given**: api_server が無効のエージェント詳細ページ
**When**: Chat タブを開く
**Then**: `.env` への手動 `API_SERVER_PORT` 設定を前提とせず、api_server 有効化と gateway 再起動の必要性が表示される
