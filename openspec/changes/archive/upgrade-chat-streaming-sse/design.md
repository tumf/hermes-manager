# Design: Upgrade Chat Tab to SSE Streaming

## Architecture

```
┌────────────────────┐     SSE      ┌──────────────────────┐     SSE proxy    ┌──────────────────────┐
│  Browser           │◀────────────│  Next.js API Route    │◀───────────────│  hermes gateway      │
│  ChatTab component │             │  POST /api/agents/    │                │  api_server platform │
│                    │─────POST───▶│       [id]/chat       │────POST───────▶│  /v1/chat/completions│
│                    │             │                       │  stream:true   │  (OpenAI compat SSE) │
└────────────────────┘             └──────────────────────┘                └──────────────────────┘
```

## api_server ポート発見

hermes gateway の api_server は動的ポート確保を行う。webapp からの発見方法:

1. `config.yaml` の platforms セクションに `api_server` が存在するか確認
2. `gateway_state.json` の `pid` と `gateway_state === "running"` を確認
3. PID から LISTEN ポートを `lsof -p {pid} -iTCP -sTCP:LISTEN` で特定
4. 特定できない場合は api_server が無効と判定

代替: gateway_state.json に api_server ポートが記録されていれば直接参照する（要確認）。

## SSE プロキシ設計

### API Route (`POST /api/agents/[id]/chat`)

```typescript
// 1. リクエストバリデーション
// 2. api_server ポート発見
// 3. gateway に fetch (stream: true)
// 4. ReadableStream をクライアントにパススルー
// 5. クライアント切断で AbortController.abort()
```

gateway への送信ペイロード:

```json
{
  "model": "hermes-agent",
  "messages": [{ "role": "user", "content": "..." }],
  "stream": true
}
```

gateway のレスポンス形式（OpenAI 互換 SSE）:

```
data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"role":"assistant"}}]}
data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"Hello"}}]}
data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":" world"}}]}
data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","choices":[{"index":0,"delta":{}},"finish_reason":"stop"}]}
data: [DONE]
```

### フロントエンド SSE 消費

`fetch` + `ReadableStream` で SSE を消費する（EventSource は POST 非対応のため不使用）。

```
状態マシン:
  ready ──send()──▶ submitted ──first token──▶ streaming ──[DONE]──▶ ready
                                                  │ stop()
                                                  ▼
                                                ready
  (any) ──error──▶ ready (error state set)
```

## セッション管理

- gateway api_server はリクエストごとに新規セッションを作成する
- セッション resume は現時点ではサポートしない（gateway API 側で conversation_history を送る形式のため）
- セッション一覧・履歴は引き続き state.db から読み取り専用で表示
- 応答完了後にセッション一覧を再取得して最新化

## 依存パッケージ

- `react-markdown`: assistant 応答の Markdown レンダリング（未導入の場合に追加）
- 既存の `better-sqlite3`: セッション/メッセージ読み取り用（変更なし）
