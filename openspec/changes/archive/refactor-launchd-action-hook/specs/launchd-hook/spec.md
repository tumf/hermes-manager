# launchd 操作フック — 仕様

## ADDED Requirements

### REQ-1: フック経由の操作が既存と同一であること

`useLaunchdAction` フックを使った start/stop/restart 操作は、既存の直接実装と同一の HTTP リクエスト・UI フィードバックを提供すること。

### シナリオ: start 成功

- Given: `useLaunchdAction("agent-1")` を利用
- When: `execute("start")` を呼び出す
- Then: `/api/launchd` に `{ agent: "agent-1", action: "start" }` が POST される
- And: `isBusy` が true になる
- And: 成功時にトースト `"agent-1 started"` が表示される
- And: `isBusy` が false に戻る

### シナリオ: エラー時

- Given: `/api/launchd` が 500 を返す
- When: `execute("stop")` を呼び出す
- Then: レスポンスの `error` または `stderr` がトーストに表示される
- And: `isBusy` が false に戻る
