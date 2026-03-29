## Implementation Tasks

- [ ] Task 1: `app/globals/page.tsx` の `AddRowForm` で `<Input>` を `EnvKeyCombobox` に置き換え — import 追加、`<Input value={key} onChange={...} placeholder="KEY_NAME" .../>` を `<EnvKeyCombobox value={key} onChange={setKey} />` に差し替え (verification: `npm run typecheck && npm run lint` パス)
- [ ] Task 2: 動作確認 — ブラウザで `/globals` ページの Add フォームに Combobox が表示され、カテゴリ付きサジェストが動作し、自由入力も可能であることを確認 (verification: `npm run test` パス、ブラウザで確認)
