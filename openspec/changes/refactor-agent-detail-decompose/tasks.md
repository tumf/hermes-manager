# タスク

## T1: 現状の特性テスト確認

- [ ] `npm run test -- tests/ui/agent-detail-page.test.tsx` を実行し、全件グリーンであることを確認
- [ ] テストが不足している場合は、既存の振る舞い（ステータス表示、start/stop トースト、メタデータ保存）のスナップショットテストを追加

## T2: カスタムフック抽出

- [ ] `src/hooks/use-agent-status.ts` を作成し、fetchStatus・handleStartStop・actionBusy 状態を移動
- [ ] `src/hooks/use-agent-meta.ts` を作成し、fetchMeta・saveMeta・metaDraft 状態を移動
- [ ] page.tsx からフックを呼び出すように変更

## T3: ヘッダーコンポーネント分割

- [ ] `src/components/agent-status-header.tsx` — ステータスバッジ + 操作ボタン
- [ ] `src/components/agent-metadata-card.tsx` — メタデータ編集カード
- [ ] page.tsx の JSX を置き換え

## T4: 回帰確認

- [ ] `npm run test` 全件パス
- [ ] `npm run typecheck && npm run lint` パス
- [ ] page.tsx が 200 行以下であること
