# Tasks: update-memory-files-and-drop-agents-md

## Implementation Tasks

- [ ] Task 1: Memory タブ仕様を `MEMORY.md` / `USER.md` / `SOUL.md` の3ファイル切替に更新する (verification: `src/components/agent-memory-tab.tsx`, `tests/ui/agent-detail-page.test.tsx` で `AGENTS.md` 非依存かつ3ファイル切替の期待値を確認)
- [ ] Task 2: Files API の許可ファイルと検証を更新し、`AGENTS.md` を拒否して `MEMORY.md` / `USER.md` / `SOUL.md` / `config.yaml` のみ受け付ける (verification: `app/api/files/route.ts`, `tests/api/files.test.ts` で enum と失敗/成功ケースを確認)
- [ ] Task 3: agent 作成の scaffold とバリデーションを更新し、`MEMORY.md` / `USER.md` / `SOUL.md` / `config.yaml` を生成対象にする (verification: `app/api/agents/route.ts`, `src/lib/agents.ts`, `src/lib/validators/agents.ts`, `tests/api/agents.test.ts` で生成ファイル一覧を確認)
- [ ] Task 4: templates の許可ファイル、fallback、UI 選択肢、保存対象を更新し、`AGENTS.md` を除去して `MEMORY.md` / `USER.md` / `SOUL.md` / `config.yaml` を扱う (verification: `src/lib/templates.ts`, `app/api/templates/route.ts`, `src/lib/validators/templates.ts`, `src/components/add-agent-dialog.tsx`, テンプレート関連テストで fileType と表示名を確認)
- [ ] Task 5: canonical spec・OpenAPI・関連ドキュメントを新しい memory/file/template 構成へ同期する (verification: `openspec/specs/memory-tab/spec.md`, `openspec/specs/data-layer/spec.md`, `openspec/specs/agent-management/spec.md`, `openspec/specs/agent-templates/spec.md`, `openapi.yaml`, `docs/requirements.md`, `docs/design.md` の記述一致を確認)
- [ ] Task 6: 変更後の lint/typecheck/test を通す (verification: `npm run test`, `npm run typecheck`, `npm run lint`, `npm run format:check`)

## Future Work

- 必要なら既存 `AGENTS.md` 実ファイルを棚卸しし、別 proposal で安全な移行/削除方針を決める
