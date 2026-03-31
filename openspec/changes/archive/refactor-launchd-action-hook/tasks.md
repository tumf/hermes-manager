# タスク

## T1: 現状の特性テスト確認

- [x] `npm run test` を実行し、launchd 操作に関連するテストが全件グリーンであることを確認
- [x] 両ページで start/stop/restart のトースト表示をテストするケースがなければ追加

## T2: カスタムフック作成

- [x] `src/hooks/use-launchd-action.ts` を作成
- [x] `/api/launchd` への POST、busy 状態管理、エラーメッセージ組み立て、トースト表示を集約
- [x] 単体テスト `tests/hooks/use-launchd-action.test.ts` を作成

## T3: 既存ページへの適用

- [x] `app/page.tsx` の `handleStartStop` をフックに置き換え
- [x] `app/agents/[id]/page.tsx` の `handleStartStop` をフックに置き換え

## T4: 回帰確認

- [x] `npm run test` 全件パス
- [x] `npm run typecheck && npm run lint` パス
