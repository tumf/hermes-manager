# エージェント一覧ページ分割 — 仕様

## MODIFIED Requirements

### REQ-1: 分割後の機能同一性

分割後のエージェント一覧ページは、分割前と同一の表示・操作を提供すること。

### シナリオ: エージェント追加

- Given: Add Agent ダイアログを開く
- When: テンプレートを選択し、フォームを送信する
- Then: `/api/agents` に POST が送信される
- And: 成功時にダイアログが閉じ、一覧が再取得される
- And: トーストで作成完了が表示される

### シナリオ: エージェント削除

- Given: エージェントカードのドロップダウンから Delete を選択
- When: 確認ダイアログで OK を押す
- Then: `/api/agents?id=...&purge=true` に DELETE が送信される
- And: 一覧が再取得される
