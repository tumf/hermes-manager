# タスク

## T1: 現状の特性テスト確認

- [x] `npm run test -- tests/ui/agents-page.test.tsx` を実行し、全件グリーンであることを確認

## T2: AddAgentDialog コンポーネント抽出

- [x] `src/components/add-agent-dialog.tsx` を作成
- [x] テンプレート選択（agentsMd / soulMd / configYaml）の useState と useMemo を移動
- [x] handleAdd ロジックを移動し、成功時のコールバックを props 経由で受け取る

## T3: AgentCard コンポーネント抽出

- [x] `src/components/agent-card.tsx` を作成
- [x] カード表示 + ドロップダウンメニュー（Copy / Delete）+ start/stop ボタンを移動
- [x] handleStartStop / handleDelete / handleCopy をコールバック props 化

## T4: 回帰確認

- [x] `npm run test` 全件パス
- [x] `npm run typecheck && npm run lint` パス
- [x] page.tsx が 150 行以下であること
