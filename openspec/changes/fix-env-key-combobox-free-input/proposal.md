# Fix EnvKeyCombobox Free Text Input

## Problem/Context

`EnvKeyCombobox` は自由入力に対応しているように見えるが、実際には **サジェスト候補に部分一致する文字列を入力した場合、「Use "..."」ボタンが表示されない** バグがある。

### 根本原因

cmdk の `CommandEmpty` は **フィルタ結果が0件のときのみ** レンダリングされる。つまり：

- `MY_CUSTOM` と入力 → 候補に一致なし → `CommandEmpty` 表示 → 「Use "MY_CUSTOM"」ボタンが出る ✅
- `OPEN` と入力 → `OPENROUTER_API_KEY` 等がフィルタに残る → `CommandEmpty` 非表示 → 自由入力不可 ❌
- `TELEGRAM` と入力 → `TELEGRAM_ALLOWED_USERS` が残る → 自由入力不可 ❌

AGENTS.md には「任意のキーの入力を妨げてはダメ」と明記されており、現状はこの要件に反している。

## Proposed Solution

`CommandEmpty` 内の「Use "..."」ボタンに頼るのではなく、**検索テキストがサジェスト候補と完全一致しない場合は常に「Use "..."」オプションを候補リストの先頭に表示する** 方式に変更する。

具体的には：

1. `CommandList` 内、`CommandGroup` の前に、検索テキストが空でなく既知キーと完全一致しない場合に `CommandItem` として `Use "{search}"` を常時表示
2. `CommandEmpty` は「No keys found.」メッセージのみに簡素化
3. Enter キーでも自由入力テキストを確定できるようにする

## Acceptance Criteria

1. ドロップダウンに任意の文字列を入力し、候補に部分一致があっても「Use "..."」オプションが表示される
2. 「Use "..."」を選択すると、入力した文字列がキー名として確定される
3. 候補から既知キーを選択する既存動作は維持される
4. 空文字の場合は「Use "..."」オプションは表示されない
5. Agent Env タブ・Global Variables ページ双方で動作する
6. `npm run typecheck && npm run lint && npm run test` がすべてパスする

## Out of Scope

- `hermes-env-keys.ts` のキーリスト更新
- Global Variables ページへの `EnvKeyCombobox` 導入（別提案 `add-globals-env-key-combobox` で対応）
