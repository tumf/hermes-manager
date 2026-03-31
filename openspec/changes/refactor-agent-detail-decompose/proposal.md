# エージェント詳細ページのコンポーネント分割

Change Type: implementation

## 概要

`app/agents/[id]/page.tsx`（821行）は、メタデータ編集・ステータス管理・start/stop/restart操作・タブ表示（Memory/Soul/Settings/Env/Cron/Skills/Logs）をすべて1ファイルに持つ God Component である。状態管理が複雑で、変更時の影響範囲が読みにくい。

## 問題

- 1ファイルに 15 以上の `useState` があり、認知負荷が高い
- ステータス取得ロジック・メタデータ保存ロジック・launchd 操作ロジックが UI と密結合
- 個別タブ（Env, Cron, Skills 等）は既にコンポーネント化済みだが、ヘッダー部分（ステータスバッジ・start/stop ボタン・メタデータフォーム）は未分割

## 提案

以下のコンポーネントに分割する:

1. `AgentStatusHeader` — ステータスバッジ + start/stop/restart ボタン
2. `AgentMetadataCard` — メタデータ編集フォーム
3. `useAgentStatus` カスタムフック — fetchStatus + actionBusy 管理
4. `useAgentMeta` カスタムフック — fetchMeta + saveMeta 管理

## 受け入れ基準

- 既存テスト（`tests/ui/agent-detail-page.test.tsx`）が全件パスすること
- `npm run typecheck && npm run lint` がパスすること
- ページの表示・操作の機能的変更がないこと
- 分割後の page.tsx が 200 行以下になること
