# Add Environment Variable Key Name Suggestions

## Problem/Context

- Agent 詳細ページの Env タブでは、環境変数のキー名を素のテキスト入力で自由入力する必要がある
- Hermes Agent は `.env.example` で約60個のキーを公式にサポートしているが、ユーザーはそれらを暗記するか別途参照する必要がある
- キー名のタイプミスや未知のキーの発見漏れが起きやすく、設定ミスの原因になる

## Proposed Solution

- 環境変数キー名入力フィールドを Combobox（`Command` + `Popover` の shadcn パターン）に置き換える
- Hermes 公式 `.env.example` から抽出したキー候補をカテゴリ別にグループ表示する
- 入力に応じて候補をフィルタし、選択時にキー名を自動入力する
- 候補にないカスタムキー名も自由入力可能（既存動作を壊さない）
- 候補データは静的定数ファイル（`lib/hermes-env-keys.ts`）として管理し、API 追加は不要

## Acceptance Criteria

- Env タブの「Add」フォームでキー名入力時にドロップダウンで候補が表示される
- 候補はカテゴリ（LLM Provider / Tool API Keys / Terminal / Browser / Voice・STT / Gateway / Debug / RL Training / Skills Hub）ごとにグループ化される
- テキスト入力で候補がフィルタされる（部分一致）
- 候補を選択するとキー名フィールドに反映される
- 候補にないキー名も自由入力で登録できる
- 既存のテスト・lint・typecheck が通る

## Out of Scope

- `.env.example` のリモート自動取得（将来検討）
- 各キーの説明テキスト/ツールチップ表示（将来検討）
- 既に登録済みのキーを候補から除外する機能（将来検討）
- Globals ページへの同機能適用（Globals UI 実装時に対応）
