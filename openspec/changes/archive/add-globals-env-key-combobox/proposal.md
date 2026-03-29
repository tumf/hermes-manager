# Add EnvKeyCombobox to Global Variables Page

## Problem/Context

Global Variables ページ (`app/globals/page.tsx`) のキー名入力は素の `<Input>` を使用しており、Hermes Agent の既知キー候補（LLM Provider, Tool API Keys 等）のサジェストが提供されない。一方、Agent Env タブでは既に `EnvKeyCombobox` コンポーネントによるカテゴリ付きサジェスト＋自由入力が実装済みである。

AGENTS.md にも「Global にもキーのサジェストが必要」と明記されている。

## Dependencies

- `fix-env-key-combobox-free-input` — EnvKeyCombobox の自由入力バグを先に修正する必要がある

## Proposed Solution

`app/globals/page.tsx` の `AddRowForm` 内キー名入力を、`EnvKeyCombobox` コンポーネントに置き換える。

- 自由入力の修正は `fix-env-key-combobox-free-input` で対応済みの前提
- Agent Env タブと同じ UX を Global Variables ページでも提供する

## Acceptance Criteria

1. Global Variables ページの追加フォームでキー名入力にカテゴリ付きサジェストが表示される
2. サジェスト候補以外の任意のキー名も自由入力できる
3. 既存のバリデーション（`/^[A-Za-z_][A-Za-z0-9_]*$/`）は維持される
4. `npm run typecheck && npm run lint && npm run test` がすべてパスする

## Out of Scope

- `EnvKeyCombobox` コンポーネント自体の変更（別提案 `fix-env-key-combobox-free-input` で対応）
- `hermes-env-keys.ts` のキーリスト更新
- API エンドポイントの変更
