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
