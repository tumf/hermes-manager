## Implementation Tasks

- [ ] Task 1: `EnvKeyCombobox` の自由入力表示ロジックを修正 — `CommandEmpty` 内の「Use "..."」ボタンを削除し、`CommandList` の先頭に `search.trim()` が空でなく `ALL_HERMES_ENV_KEYS` と完全一致しない場合に `CommandItem` として「Use "{search}"」を常時表示する (`src/components/env-key-combobox.tsx`) (verification: `npm run typecheck && npm run lint` パス)
- [ ] Task 2: Enter キー対応 — 検索テキスト入力中に Enter を押すと自由入力テキストが確定されるようにする (verification: ブラウザで動作確認)
- [ ] Task 3: 既存テスト修正＋自由入力テスト追加 — 部分一致する文字列入力時にも「Use "..."」が表示されることを検証するテストケースを `tests/ui/env-key-combobox.test.tsx` に追加 (verification: `npm run test` パス)
