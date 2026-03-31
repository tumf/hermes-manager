# タスク

## T1: 現状の特性テスト確認

- [ ] `npm run test` を実行し、launchd 操作に関連するテストが全件グリーンであることを確認
- [ ] 両ページで start/stop/restart のトースト表示をテストするケースがなければ追加

## T2: カスタムフック作成

- [ ] `src/hooks/use-launchd-action.ts` を作成
- [ ] `/api/launchd` への POST、busy 状態管理、エラーメッセージ組み立て、トースト表示を集約
- [ ] 単体テスト `tests/hooks/use-launchd-action.test.ts` を作成

## T3: 既存ページへの適用

- [ ] `app/page.tsx` の `handleStartStop` をフックに置き換え
- [ ] `app/agents/[id]/page.tsx` の `handleStartStop` をフックに置き換え

## T4: 回帰確認

- [ ] `npm run test` 全件パス
- [ ] `npm run typecheck && npm run lint` パス
