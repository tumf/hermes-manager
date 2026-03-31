# エージェント詳細ページ分割 — 仕様

## MODIFIED Requirements

### REQ-1: フック抽出後の機能同一性

分割後のエージェント詳細ページは、分割前と同一の HTTP リクエストを同一タイミングで発行し、同一の UI 状態遷移を行うこと。

### シナリオ: ステータス取得

- Given: エージェント詳細ページを開く
- When: ページがマウントされる
- Then: `/api/launchd` に `{ agent, action: "status" }` が POST される
- And: レスポンスに応じて Running/Stopped バッジが表示される

### シナリオ: start/stop 操作

- Given: エージェントが Stopped 状態
- When: Start ボタンをクリック
- Then: actionBusy が "start" になり、ボタンが disabled になる
- And: `/api/launchd` に `{ agent, action: "start" }` が POST される
- And: 成功時にトーストが表示され、ステータスが再取得される
