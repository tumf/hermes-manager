---
change_type: implementation
priority: high
dependencies: []
references:
  - docs/design.md
  - openspec/specs/agent-detail/spec.md
---

# Add Chat Feature — エージェントとのチャット機能

**Change Type**: implementation

## Problem / Context

現状、Hermes エージェントとの対話は Telegram 等の外部プラットフォーム経由のみ。
WebApp の管理画面から直接チャットできれば、開発・デバッグ効率が大幅に向上する。

各エージェントの `state.db`（SQLite）に全セッション・メッセージが保存されており、
`hermes chat` CLI で非対話メッセージ送信・セッション再開が可能。

## Proposed Solution

エージェント詳細ページに「Chat」タブを追加し、以下の機能を提供する。

### データソース

- **state.db**（`runtime/agents/{agentId}/state.db`）
  - `sessions` テーブル: id, source, title, model, message_count, tool_call_count, tokens, cost, started_at, ended_at
  - `messages` テーブル: session_id, role, content, tool_calls, tool_call_id, tool_name, timestamp
- **hermes chat CLI**
  - `hermes chat -q <message> -Q --source tool` — 非対話メッセージ送信
  - `--resume <sessionId>` — 既存セッション再開
  - `HERMES_HOME` 環境変数でエージェント指定

### API 設計

| エンドポイント                                   | メソッド | 説明                                    |
| ------------------------------------------------ | -------- | --------------------------------------- |
| `/api/agents/[id]/sessions`                      | GET      | セッション一覧（state.db から読み取り） |
| `/api/agents/[id]/sessions/[sessionId]/messages` | GET      | メッセージ一覧（state.db から読み取り） |
| `/api/agents/[id]/chat`                          | POST     | メッセージ送信（hermes chat CLI 経由）  |

### フロントエンド

- **Chat タブ**: エージェント詳細ページのタブとして追加
- **セッション一覧パネル**: source 別アイコン、日時、メッセージ数表示
- **チャットUI**: shadcn AI Elements ベースのバブル UI（user/assistant/tool ロール対応）
- **セッション操作**: 既存セッション閲覧・resume で会話継続・新規セッション作成
- **ローディング状態**: hermes 実行は数秒〜数十秒かかるため適切な UX 提供

### 技術的考慮

- state.db は SQLite（読み取り専用、WAL モード想定）→ `better-sqlite3` で同期読み取り
- chat 送信は `execFile` 使用（セキュリティルール準拠）、タイムアウト 120s
- `--source tool` で WebApp 経由のセッションを識別
- セッション一覧では source 別フィルタ可能

## Acceptance Criteria

1. エージェント詳細ページに Chat タブが表示される
2. Chat タブでセッション一覧が表示され、source/日時でフィルタ・ソートできる
3. セッションを選択するとメッセージ履歴がバブル UI で表示される
4. テキスト入力からメッセージを送信でき、エージェントの応答が表示される
5. 既存セッションを resume して会話を継続できる
6. 新規セッションを開始できる
7. 送信中はローディング状態が表示される
8. state.db が存在しないエージェントでは適切なメッセージが表示される

## Out of Scope

- SSE/WebSocket によるストリーミング対応（将来、RPC Mode 実装後）
- メッセージの編集・削除
- ファイルアップロード
