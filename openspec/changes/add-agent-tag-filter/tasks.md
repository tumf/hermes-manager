## Implementation Tasks

- [x] `app/page.tsx` に一覧用タグ集合の導出と選択状態管理を追加し、選択タグに応じて表示対象 agent をクライアント側で絞り込む（verification: `tests/ui/agents-page.test.tsx` で単一タグ・複数タグ・解除が検証される）
- [x] `src/components/agents-list-content.tsx` にタグ絞り込み UI と 0 件時の empty state / clear filters 導線を追加する（verification: UI テストで filter controls と 0 件表示を確認する）
- [x] 既存の tags 表示スタイルに沿って active / inactive を識別できる filter chip/button 表現と、キーボード操作可能なアクセシブルなコントロールを実装する（verification: code review と UI テストで button semantics を確認する）
- [x] `src/lib/translations/*.ts` の agents list 文言を更新し、追加 UI が既存 locale で壊れず fallback しないことを担保する（verification: typecheck と UI テスト）
- [x] `tests/ui/agents-page.test.tsx` を拡張し、タグ絞り込み・複数タグ OR 条件・0 件状態・フィルタ解除をカバーする（verification: `npm run test`）
- [x] `docs/requirements.md` / `docs/design.md` を提案内容に合わせて更新し、Agents 一覧の fleet ergonomics 改善としてタグ絞り込みを明記する（verification: manual - docs と spec の整合確認）
- [x] `npm run test && npm run typecheck && npm run lint` を通す（verification: manual - 3 コマンド成功）

## Future Work

- URL クエリによるフィルタ状態共有
- タグの AND 条件や除外条件
- 起動状態や name 検索との複合フィルタ
