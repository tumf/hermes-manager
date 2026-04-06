## Requirements

### Requirement: session-list-api

WebApp は state.db からエージェントのセッション一覧を取得する API を提供する。

#### Scenario: セッション一覧を取得する

**Given**: エージェント `agent-1` の state.db に 3 つのセッションが存在する
**When**: `GET /api/agents/agent-1/sessions` を呼び出す
**Then**: 3 件のセッションが `started_at` 降順で返される（id, source, title, model, messageCount, startedAt, endedAt を含む）

#### Scenario: state.db が存在しないエージェント

**Given**: エージェント `agent-2` に state.db が存在しない
**When**: `GET /api/agents/agent-2/sessions` を呼び出す
**Then**: 空配列 `{ sessions: [] }` が返される

#### Scenario: source フィルタ

**Given**: エージェントに telegram, cli, tool の各セッションが存在する
**When**: `GET /api/agents/agent-1/sessions?source=telegram` を呼び出す
**Then**: source が `telegram` のセッションのみ返される

### Requirement: messages-api

WebApp は state.db から指定セッションのメッセージ一覧を取得する API を提供する。

#### Scenario: メッセージ一覧を取得する

**Given**: セッション `sess-1` に 5 件のメッセージが存在する
**When**: `GET /api/agents/agent-1/sessions/sess-1/messages` を呼び出す
**Then**: 5 件のメッセージが timestamp 昇順で返される（role, content, toolCalls, toolName, timestamp を含む）

#### Scenario: 存在しないセッション

**Given**: セッション `nonexistent` が state.db に存在しない
**When**: `GET /api/agents/agent-1/sessions/nonexistent/messages` を呼び出す
**Then**: 空配列 `{ messages: [] }` が返される

### Requirement: chat-api

WebApp は hermes chat CLI 経由でエージェントにメッセージを送信する API を提供する。

#### Scenario: 新規セッションでメッセージ送信

**Given**: エージェント `agent-1` が存在する
**When**: `POST /api/agents/agent-1/chat` に `{ message: "hello" }` を送信する
**Then**: hermes chat が実行され `{ response: "...", sessionId: "..." }` が返される

#### Scenario: 既存セッションを resume してメッセージ送信

**Given**: エージェント `agent-1` にセッション `sess-1` が存在する
**When**: `POST /api/agents/agent-1/chat` に `{ message: "hello", sessionId: "sess-1" }` を送信する
**Then**: `--resume sess-1` 付きで hermes chat が実行される

#### Scenario: タイムアウト

**Given**: エージェントの応答に 120 秒以上かかる
**When**: `POST /api/agents/agent-1/chat` を呼び出す
**Then**: タイムアウトエラー (504 or 408) が返される

### Requirement: chat-tab-ui

エージェント詳細ページに Chat タブが表示され、セッション閲覧・チャット送受信ができる。

#### Scenario: Chat タブの表示

**Given**: エージェント詳細ページを開く
**When**: Chat タブをクリックする
**Then**: セッション一覧パネルとチャットエリアが表示される

#### Scenario: セッション選択とメッセージ表示

**Given**: Chat タブでセッション一覧が表示されている
**When**: セッションをクリックする
**Then**: そのセッションのメッセージがバブル UI で表示される

#### Scenario: メッセージ送信

**Given**: Chat タブが表示されている
**When**: テキストを入力して送信ボタンを押す
**Then**: メッセージが送信され、ローディング表示後にエージェントの応答が表示される

### Requirement: chat-api

WebApp は hermes gateway の api_server プラットフォーム（OpenAI 互換 API）を経由して、SSE ストリーミングでエージェントにメッセージを送信する API を提供する。

#### Scenario: ストリーミングメッセージ送信

**Given**: エージェント `agent-1` の gateway が api_server 有効で起動中
**When**: `POST /api/agents/agent-1/chat` に `{ "message": "hello" }` を送信する
**Then**: Content-Type `text/event-stream` で OpenAI 互換 SSE チャンクが逐次返され、最後に `data: [DONE]` が送信される

#### Scenario: api_server 未有効

**Given**: エージェント `agent-1` の config.yaml に api_server プラットフォームが設定されていない
**When**: `POST /api/agents/agent-1/chat` に `{ "message": "hello" }` を送信する
**Then**: `503 { "error": "api_server not available" }` が返される

#### Scenario: クライアント切断時の中断

**Given**: エージェントが SSE ストリーミング中
**When**: クライアントが接続を切断する
**Then**: アップストリームの gateway 接続が abort され、gateway がエージェントを interrupt する

### Requirement: chat-tab-ui

エージェント詳細ページの Chat タブは、api_server の有効/無効に応じてストリーミングチャット UI またはガイダンスを表示する。

#### Scenario: api_server 有効時のストリーミング表示

**Given**: api_server が有効かつ gateway が起動中のエージェント詳細ページ
**When**: Chat タブを開きメッセージを送信する
**Then**: user メッセージが即座に表示され、assistant の応答がトークン単位で逐次表示される

#### Scenario: api_server 無効時のガイダンス表示

**Given**: api_server が無効のエージェント詳細ページ
**When**: Chat タブを開く
**Then**: 「Chat を使うには api_server プラットフォームを有効にし、gateway を再起動してください」というガイダンスが表示される

#### Scenario: Stop ボタンによるストリーミング中断

**Given**: ストリーミング中のチャット UI
**When**: Stop ボタンをクリックする
**Then**: ストリーミングが中断され、受信済みテキストは保持される

#### Scenario: エラー時の Retry

**Given**: チャット送信がエラーになった状態
**When**: Retry ボタンをクリックする
**Then**: 最後の user メッセージが再送される

#### Scenario: Markdown レンダリング

**Given**: assistant が Markdown 記法を含む応答を返す
**When**: 応答がチャット UI に表示される
**Then**: コードブロック、リスト、リンク等が Markdown として正しくレンダリングされる

#### Scenario: 自動スクロール

**Given**: チャットエリアにメッセージが表示されている
**When**: 新しいメッセージが到着する or ストリーミング中にテキストが追加される
**Then**: チャットエリアが最下部に自動スクロールされる（ユーザーが上にスクロール中は追従停止）

## Requirements

### Requirement: api-server-discovery

WebApp はエージェントの hermes gateway api_server の有効状態とポートを発見できる。

#### Scenario: api_server ポート発見

**Given**: エージェントの config.yaml に api_server が有効で gateway が起動中
**When**: webapp がポート発見ロジックを実行する
**Then**: api_server の LISTEN ポート番号が返される

#### Scenario: api_server 未有効時

**Given**: エージェントの config.yaml に api_server が含まれていない
**When**: webapp がポート発見ロジックを実行する
**Then**: `null` が返される（api_server 未有効）

#### Scenario: gateway 未起動時

**Given**: エージェントの gateway プロセスが起動していない
**When**: webapp がポート発見ロジックを実行する
**Then**: `null` が返される（gateway 未起動）

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
