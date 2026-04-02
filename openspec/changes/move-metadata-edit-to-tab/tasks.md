## Implementation Tasks

- [x] Task 1: 共通部に description / tags の読み取り専用表示を追加 — `app/agents/[id]/page.tsx` のヘッダー領域に `meta.description` をテキスト表示、`meta.tags` を Badge コンポーネントで表示（未設定時は非表示）(verification: `npm run typecheck && npm run lint` パス、ブラウザで description と tags が表示される)
- [x] Task 2: `AgentMetadataCard` をタブ内に移動 — `page.tsx` から共通部の `<AgentMetadataCard>` を削除し、新規 `Metadata` タブ（`TabsContent value="metadata"`）内に配置。タブ順序を Metadata / Memory / Config / Env / Skills / Cron / Chat / Logs に変更 (verification: `npm run typecheck` パス、`AgentMetadataCard` がタブ内のみに表示される)
- [x] Task 3: デフォルトタブを `metadata` に変更 — `useState` の初期値を `'memory'` から `'metadata'` に変更、ハッシュなし初期表示で Metadata タブが選択される (verification: `/agents/[id]` を開くと Metadata タブがアクティブ)
- [x] Task 4: `docs/design.md` §7 UI 設計を更新 — 「ヘッダーに name/description/tags のインライン編集」を「共通部は表示のみ、Metadata タブで編集」に変更、タブ一覧に Metadata を追加 (verification: ドキュメントとコードの整合性)
- [x] Task 5: `docs/requirements.md` §12 UI 概要を更新 — タブ一覧に Metadata を追加 (verification: ドキュメントとコードの整合性)
- [x] Task 6: 既存テストの修正 — デフォルトタブ変更やコンポーネント配置変更に伴うテスト修正 (verification: `npm run test` 全パス)

## Future Work

- タグによるフィルタリング UI
- description の Markdown プレビュー表示
