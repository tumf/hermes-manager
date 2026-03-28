## Implementation Tasks

- [ ] Task 1: DB スキーマに `templates` テーブルを追加 — `db/schema.ts` に `templates(id PK, fileType TEXT, name TEXT, content TEXT, createdAt, updatedAt)` を追加、`fileType + name` で UNIQUE 制約 (verification: `npm run db:generate` でマイグレーション生成、`npm run typecheck` パス)
- [ ] Task 2: テンプレート用バリデータ作成 — `src/lib/validators/templates.ts` に zod スキーマ（fileType は `z.enum(['agents.md','soul.md','config.yaml'])`、name は `[a-zA-Z0-9_-]+`、content は string） (verification: `npm run typecheck` パス)
- [ ] Task 3: `/api/templates` API 実装 — GET（全件 or fileType フィルタ）、POST（作成）、PUT（更新）、DELETE（削除） (verification: `npm run typecheck && npm run lint` パス)
- [ ] Task 4: `POST /api/agents` 更新 — オプショナルな `templates` ボディパラメータを受け取り、指定テンプレートの content で scaffold。未指定時は `default` テンプレートを DB から取得、無ければ現行の固定内容にフォールバック (verification: `npm run typecheck` パス、テストで template 指定/未指定/default 有無の 3 パターン確認)
- [ ] Task 5: Add Agent ダイアログ UI 実装 — `app/page.tsx` の Add Agent ボタンを Dialog 化、3 つの Select（AGENTS.md / SOUL.md / config.yaml テンプレート選択）、`default` 初期選択、Create ボタン (verification: `npm run typecheck && npm run lint` パス)
- [ ] Task 6: テンプレート管理 UI 実装 — テンプレート一覧表示、追加/編集/削除フォーム（fileType 別にグループ化）。配置場所は `/templates` ページまたは設定セクション (verification: `npm run typecheck && npm run lint` パス)
- [ ] Task 7: "Save as Template" 機能 — エージェント詳細の Memory/Config タブから現在のファイル内容をテンプレートとして保存するボタン (verification: `npm run typecheck && npm run lint` パス)
- [ ] Task 8: テスト追加 — `/api/templates` CRUD テスト、`POST /api/agents` のテンプレート適用テスト (verification: `npm run test` パス)
- [ ] Task 9: ドキュメント更新 — `docs/requirements.md` に FR-10 Templates、`docs/design.md` に templates テーブル・API・UI 設計を追加 (verification: ドキュメント内容が実装と一致)
- [ ] Task 10: 全チェック通過確認 (verification: `npm run test && npm run typecheck && npm run lint && npm run format:check`)

## Future Work

- テンプレート内変数展開（`{{id}}` 等のプレースホルダー）
- テンプレートの import/export（ファイルからの一括取り込み）
- テンプレートのバージョン管理/履歴
