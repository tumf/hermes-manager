# Tasks: fix-memory-file-paths-and-order

## Implementation Tasks

- [x] Task 1: Memory タブを `SOUL.md` / `memories/MEMORY.md` / `memories/USER.md` の3ファイル切替に変更し、`SOUL.md` をデフォルト表示にする (verification: `src/components/agent-memory-tab.tsx` の `MEMORY_FILES` 配列が `['SOUL.md', 'memories/MEMORY.md', 'memories/USER.md']` 順、`tests/ui/agent-detail-page.test.tsx` でデフォルト表示が `SOUL.md` であることを確認)
- [x] Task 2: Files API の許可パスを `SOUL.md`, `memories/MEMORY.md`, `memories/USER.md`, `config.yaml` に変更し、`AGENTS.md` を拒否する (verification: `app/api/files/route.ts` の `AllowedPathEnum`、`tests/api/files.test.ts` で `AGENTS.md` が 400、`memories/MEMORY.md` が成功するケースを確認)
- [x] Task 3: agent 作成 scaffold を更新し、`memories/` サブディレクトリ配下に `MEMORY.md` / `USER.md` を生成、`AGENTS.md` を生成しない (verification: `src/lib/agents.ts` の `createAgent` で `memories/` mkdir + ファイル書き込み、`tests/api/agents.test.ts` / `tests/lib/agents.test.ts` で生成パスを確認)
- [x] Task 4: Templates の許可ファイル・fallback・UI 選択肢を `SOUL.md`, `memories/MEMORY.md`, `memories/USER.md`, `config.yaml` に更新する (verification: `src/lib/templates.ts` の `ALLOWED_FILES`、`src/lib/validators/templates.ts` の `fileSchema`、`src/components/add-agent-dialog.tsx` のテンプレート選択が4ファイル構成、`tests/api/templates.test.ts` / `tests/lib/templates.test.ts` の期待値を確認)
- [x] Task 5: `CreateAgentSchema` のテンプレート選択キーを `agentsMd` → 削除、`memoryMd` / `userMd` を追加する (verification: `src/lib/validators/agents.ts`、`app/api/agents/route.ts` の `resolveTemplateContent` 呼び出しを確認)
- [x] Task 6: canonical spec・OpenAPI・関連ドキュメントを新しいファイルパス・表示順に同期する (verification: `openspec/specs/memory-tab/spec.md`, `openspec/specs/data-layer/spec.md`, `openspec/specs/agent-management/spec.md`, `openspec/specs/agent-templates/spec.md`, `openapi.yaml`, `docs/requirements.md`, `docs/design.md` の記述が `memories/MEMORY.md`, `memories/USER.md` パスを使用)
- [x] Task 7: テストヘルパー fixture の `AGENTS.md` エントリを削除し、新しいファイル構成に合わせる (verification: `tests/helpers/agent-detail-fixtures.ts` の fixture が `SOUL.md`, `memories/MEMORY.md`, `memories/USER.md` を含む)
- [x] Task 8: lint/typecheck/test を通す (verification: `npm run test && npm run typecheck && npm run lint && npm run format:check`)

## Future Work

- 既存 agent の `AGENTS.md` 実ファイルの棚卸しと安全な削除方針を別 proposal で決める
