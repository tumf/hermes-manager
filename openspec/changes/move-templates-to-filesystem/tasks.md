## Implementation Tasks

- [x] Task 1: `src/lib/runtime-paths.ts` に `getRuntimeTemplatesRootPath()` を追加し、`ensureRuntimeDirectories()` に `runtime/templates/default/` の自動配置ロジックを追加（verification: `runtime/templates/default/` に `AGENTS.md`, `SOUL.md`, `config.yaml` が自動生成されること。既存ファイルが上書きされないこと）
- [x] Task 2: `src/lib/templates.ts` を新規作成 — fs ベースのテンプレート CRUD ヘルパー関数群（`listTemplates`, `getTemplateFile`, `writeTemplateFile`, `deleteTemplate`, `deleteTemplateFile`, `resolveTemplateContent`）（verification: ユニットテスト `tests/lib/templates.test.ts`）
- [x] Task 3: `app/api/templates/route.ts` を DB ベースから fs ベースに書き換え（verification: `tests/api/templates.test.ts` を fs mock ベースに更新しパス）
- [x] Task 4: `app/api/agents/route.ts` のテンプレート解決を DB → `resolveTemplateContent()` に変更（verification: `tests/api/agents.test.ts` が既存テストパス）
- [x] Task 5: `db/schema.ts` から `templates` テーブル定義を削除（verification: `npm run typecheck` パス、他ファイルで `schema.templates` 参照がないこと）
- [x] Task 6: `src/lib/validators/templates.ts` を fs ベース API に合わせて更新（`fileType` → `file`, `name` バリデーション維持）（verification: typecheck パス）
- [x] Task 7: `app/templates/page.tsx` を新 API レスポンス型に対応（`id`/`createdAt`/`updatedAt` 削除、テンプレート名ベースの表示に変更）（verification: UI 動作確認、typecheck パス）
- [x] Task 8: `docs/design.md` のテンプレート関連セクションを更新（verification: ドキュメント内容が実装と一致）
- [x] Task 9: `npm run test && npm run typecheck && npm run lint` 全パス確認

## Future Work

- default テンプレートの内容をユーザが UI からリセットする機能
- テンプレート内変数展開（`{{id}}` 等のプレースホルダー）
