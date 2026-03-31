# タスク

## T1: 現状の特性テスト確認

- [ ] `npm run test -- tests/ui/agents-page.test.tsx` を実行し、全件グリーンであることを確認

## T2: AddAgentDialog コンポーネント抽出

- [ ] `src/components/add-agent-dialog.tsx` を作成
- [ ] テンプレート選択（agentsMd / soulMd / configYaml）の useState と useMemo を移動
- [ ] handleAdd ロジックを移動し、成功時のコールバックを props 経由で受け取る

## T3: AgentCard コンポーネント抽出

- [ ] `src/components/agent-card.tsx` を作成
- [ ] カード表示 + ドロップダウンメニュー（Copy / Delete）+ start/stop ボタンを移動
- [ ] handleStartStop / handleDelete / handleCopy をコールバック props 化

## T4: 回帰確認

- [ ] `npm run test` 全件パス
- [ ] `npm run typecheck && npm run lint` パス
- [ ] page.tsx が 150 行以下であること
