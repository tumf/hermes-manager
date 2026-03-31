# エージェント一覧ページのコンポーネント分割

Change Type: implementation

## 概要

`app/page.tsx`（721行）は、エージェント一覧表示・追加ダイアログ・テンプレート選択・start/stop/restart・コピー・削除をすべて1ファイルに持つ。追加ダイアログだけで 200 行以上あり、各操作の `handleXxx` 関数も冗長。

## 問題

- 追加ダイアログのテンプレート選択ロジック（3種類の useMemo + 3つの useState）が肥大
- start/stop/restart の `handleStartStop` は `app/agents/[id]/page.tsx` とほぼ同一パターンだが共有されていない
- コピー・削除の操作ハンドラが本体と密結合

## 提案

1. `AddAgentDialog` コンポーネントを抽出（テンプレート選択含む）
2. `AgentCard` コンポーネントを抽出（カード表示 + ドロップダウンメニュー操作）
3. 一覧ページの `handleStartStop` は refactor-launchd-action-hook で共通化

## 受け入れ基準

- 既存テスト（`tests/ui/agents-page.test.tsx`）が全件パスすること
- `npm run typecheck && npm run lint` がパスすること
- 機能的変更がないこと
- page.tsx が 150 行以下になること
