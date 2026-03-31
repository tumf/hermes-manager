# Chat Feature — 設計

## アーキテクチャ

```
Browser (Chat Tab)
  ├── GET /api/agents/[id]/sessions       ← better-sqlite3 → state.db
  ├── GET /api/agents/[id]/sessions/[sid]/messages  ← better-sqlite3 → state.db
  └── POST /api/agents/[id]/chat          ← execFile → hermes chat CLI
```

## データアクセス

### state.db 読み取り（読み取り専用）

- `better-sqlite3` を使用（同期 API、WAL モード対応）
- DB パス: `runtime/agents/{agentId}/state.db`
- 接続は read-only モードで開く（`readonly: true`）
- DB 未存在時はエラーではなく空配列を返す

### hermes chat CLI 実行

- `child_process.execFile` で実行（shell: false、セキュリティルール準拠）
- 環境変数 `HERMES_HOME` でエージェントディレクトリを指定
- タイムアウト: 120 秒（hermes のレスポンスは数秒〜数十秒）
- `--source tool` フラグで WebApp 経由のセッションであることを識別

## UI コンポーネント構成

```
ChatTab
├── SessionListPanel        # 左サイドパネル
│   ├── SessionFilter       # source フィルタ
│   └── SessionItem[]       # セッション行
├── ChatPanel               # 右メインエリア
│   ├── ChatMessages        # メッセージバブル一覧
│   │   └── ChatBubble[]    # 個別バブル (user/assistant/tool)
│   └── ChatInput           # 入力フォーム + 送信ボタン
└── EmptyState              # state.db 未存在時
```

## セキュリティ

- agentId のパス traversal 防止: `resolve` + `startsWith(agentsDir)`
- sessionId の zod バリデーション: `z.string().regex(/^[a-zA-Z0-9_-]+$/)`
- chat メッセージ入力: 文字列長制限（4096 文字）
- execFile 使用による injection 防止
