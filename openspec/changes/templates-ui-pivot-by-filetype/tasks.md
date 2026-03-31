# Tasks: templates-ui-pivot-by-filetype

## T1: テンプレート一覧の表示軸を転置

**ファイル:** `app/templates/page.tsx`

1. `templates` 配列を `FILE_NAMES` でグルーピングする変換ロジックを追加
   - 型: `{ file: string; variants: string[] }[]`
   - `variants` はアルファベット順ソート
   - 該当テンプレートが0件のファイル種別は除外
2. カード表示を FILE_NAMES 軸に変更
   - カードタイトル: ファイル名（`AGENTS.md` 等）
   - カード内行: テンプレート名（`default` 等）+ 編集・削除ボタン
3. 展開/折りたたみの `expandedTemplates` のキーをファイル名に変更
   - 初期値: `new Set(FILE_NAMES)` （すべて展開）
4. テンプレート全体削除ボタン（`handleDeleteTemplate`）を UI から除去
   - `handleDeleteTemplate` 関数自体は残しても削除しても可（呼び出し箇所がなくなるので dead code）

## T2: テスト確認

1. `npm run typecheck` 通過
2. `npm run lint` 通過
3. `npm run test` 通過（既存テストに影響があれば修正）
