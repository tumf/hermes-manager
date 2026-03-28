## Implementation Tasks

- [x] Task 1: shadcn Command + Popover コンポーネントの追加 (verification: `ls src/components/ui/command.tsx src/components/ui/popover.tsx` で存在確認、`npm run typecheck` パス)
- [x] Task 2: `lib/hermes-env-keys.ts` に Hermes 公式キー候補の静的定数を定義 (verification: ファイルが存在しカテゴリ別にキー配列がエクスポートされている、`npm run typecheck` パス)
- [x] Task 3: `EnvKeyCombobox` コンポーネントを作成 — Command + Popover でカテゴリグループ付きキー候補表示・フィルタ・選択・自由入力に対応 (verification: `npm run typecheck` パス)
- [x] Task 4: `AgentEnvAddForm`（`app/agents/[name]/page.tsx`）のキー名 `<Input>` を `EnvKeyCombobox` に置き換え (verification: `npm run typecheck && npm run lint` パス、ブラウザで Env タブの Add フォームに Combobox が表示される)
- [x] Task 5: `EnvKeyCombobox` のユニットテストを追加 (verification: `npm run test` パス)
- [x] Task 6: 全チェック通過確認 (verification: `npm run test && npm run typecheck && npm run lint && npm run format:check`)

## Future Work

- `.env.example` をリモートから定期取得してキー候補を自動更新する仕組み
- Globals ページ実装時に同コンポーネントを再利用
- 各キーに説明テキストを追加してツールチップ表示
