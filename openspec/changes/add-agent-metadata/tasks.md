## Implementation Tasks

- [ ] Task 1: `src/lib/agents.ts` に `readMetaJson` ヘルパー追加と Agent インターフェース拡張 (verification: `npm run typecheck` pass, `name`/`description`/`tags` が Agent 型に存在)
- [ ] Task 2: `listAgents` / `getAgent` / `createAgent` で meta.json を読み書き (verification: 既存テストが pass + meta.json なしの場合のデフォルト値テスト)
- [ ] Task 3: `PUT /api/agents/[id]/meta` API ルート新設 — zod バリデーション付き (verification: `tests/` に API テスト追加、`npm run test` pass)
- [ ] Task 4: `POST /api/agents` で name/description/tags をオプション受取 (verification: テスト追加、`npm run test` pass)
- [ ] Task 5: `POST /api/agents/copy` で copy 後に name を `(Copy)` 付きに書き換え (verification: テスト追加、`npm run test` pass)
- [ ] Task 6: Agent 一覧 UI (`app/page.tsx`) で name 表示 + tags バッジ (verification: `npm run build` pass, ブラウザで目視確認)
- [ ] Task 7: Agent 詳細ヘッダー (`app/agents/[name]/page.tsx`) に name / description / tags インライン編集 UI (verification: `npm run build` pass, ブラウザで目視確認)
- [ ] Task 8: `docs/design.md` §2 ドメインモデルに name/description/tags / meta.json を追記 (verification: ドキュメントとコードの整合性)
- [ ] Task 9: 全体検証 — `npm run test && npm run typecheck && npm run lint` pass (verification: CI 相当のチェック)

## Future Work

- tags によるフィルタリング・検索 UI
- meta.json に追加フィールド（アイコン色、ピン留め等）
