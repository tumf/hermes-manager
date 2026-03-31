# Tasks: templates-ui-pivot-by-filetype

## T1: テンプレート一覧の表示軸を転置

**ファイル:** `app/templates/page.tsx`

- [x] `templates` 配列を `FILE_NAMES` でグルーピングする変換ロジックを追加（型は `{ file: string; variants: string[] }[]`、`variants` はアルファベット順ソート、該当テンプレートが0件のファイル種別は除外）。
- [x] カード表示を FILE_NAMES 軸に変更（カードタイトルはファイル名、カード内行はテンプレート名 + 編集・削除ボタン）。
- [x] 展開/折りたたみの `expandedTemplates` のキーをファイル名に変更（初期値は `new Set(FILE_NAMES)` で全展開）。
- [x] テンプレート全体削除ボタン（`handleDeleteTemplate`）を UI から除去（呼び出し箇所をなくす）。

## T2: テスト確認

- [x] `npm run typecheck` 通過
- [x] `npm run lint` 通過
- [x] `npm run test` 通過（既存テストに影響があれば修正）
