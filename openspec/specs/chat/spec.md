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
