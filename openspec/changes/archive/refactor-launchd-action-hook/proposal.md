# launchd 操作ロジックの共通フック化

Change Type: implementation

## 概要

`app/page.tsx` と `app/agents/[id]/page.tsx` の両方に、`/api/launchd` への POST + busy 状態管理 + トースト表示 + エラーハンドリングのほぼ同一パターンが存在する。DRY 違反であり、操作の振る舞い変更時に2箇所を同期する必要がある。

## 問題

- `handleStartStop` のロジックが2ファイルにほぼコピーペーストされている
- エラーメッセージの組み立てロジック（`data.error ?? data.stderr ?? fallback`）も重複
- busy 状態管理（単体 vs Record 型）が微妙に異なるが本質的に同じ

## 提案

- `src/hooks/use-launchd-action.ts` カスタムフックを作成
- 入力: agentId, action → 出力: execute(), isBusy
- トースト表示・エラーハンドリングをフック内に集約
- 両ページからフックを利用するように置き換え

## 受け入れ基準

- 既存テストが全件パスすること
- `npm run typecheck && npm run lint` がパスすること
- `/api/launchd` への POST リクエストの形式に変更がないこと
- 重複コードが1箇所に集約されること
