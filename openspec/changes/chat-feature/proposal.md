# Chat Feature — エージェントとのチャット機能

## 概要

WebApp上でエージェントと対話できるチャットUIを追加する。
state.dbから既存セッション履歴も閲覧・再開可能。

## 動機

現状、エージェントとの対話はTelegram等の外部プラットフォーム経由のみ。
管理画面から直接テスト・対話できると開発・デバッグ効率が大幅に向上する。

## データソース

### state.db（HERMES_HOME/state.db）

SQLiteデータベースに全セッション・メッセージが保存されている。

- `sessions` テーブル: id, source, title, model, message_count, tool_call_count, tokens, cost, started_at, ended_at
- `messages` テーブル: session_id, role, content, tool_calls, tool_call_id, tool_name, timestamp

### hermes chat CLI

- `hermes chat -q <message> -Q --source tool` — 非対話メッセージ送信
- `--resume <sessionId>` — 既存セッション再開
- `HERMES_HOME` 環境変数でエージェント指定

## API設計

### GET /api/agents/[id]/sessions

セッション一覧を返す（state.dbから直接読み取り）

```json
{
  "sessions": [
    {
      "id": "20260331_221913_b19a043a",
      "source": "telegram",
      "title": "...",
      "model": "...",
      "messageCount": 27,
      "startedAt": 1711918753,
      "endedAt": null
    }
  ]
}
```

### GET /api/agents/[id]/sessions/[sessionId]/messages

セッションのメッセージ一覧（state.dbから直接読み取り）

```json
{
  "messages": [
    {
      "id": 1,
      "role": "user",
      "content": "hello",
      "toolCalls": null,
      "toolName": null,
      "timestamp": 1711918753
    }
  ]
}
```

### POST /api/agents/[id]/chat

メッセージ送信

- body: `{ message: string, sessionId?: string }`
- 内部: `HERMES_HOME=runtime/agents/{id} hermes chat -q <message> -Q --source tool [--resume <sessionId>]`
- response: `{ response: string, sessionId: string }`

## フロントエンド

- エージェント詳細ページに「Chat」タブ追加
- 左サイドパネル: セッション一覧（source別アイコン、日時、メッセージ数）
- 右メイン: チャットバブルUI（user/assistant/tool）
- 既存セッションの閲覧 + resumeで会話継続
- 新規セッション作成
- ローディング状態（hermes実行は数秒〜数十秒かかる）

## 段階的実装

1. **Phase 1**: セッション/メッセージ閲覧API + UI
2. **Phase 2**: チャット送信API + UI（同期）
3. **Phase 3**: SSEストリーミング対応（将来、RPC Mode実装後）

## 技術的考慮

- state.dbはSQLite（読み取り専用、WALモード想定）→ better-sqlite3で同期読み取り
- chat送信はexecFile使用（セキュリティルール準拠）、タイムアウト120s
- `--source tool` でWebApp経由のセッションを識別
- セッション一覧ではsource別フィルタ可能に
