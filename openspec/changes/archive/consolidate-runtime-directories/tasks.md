## Implementation Tasks

- [x] 1. パス定義の統一基盤を追加し、`runtime/` 基準の解決関数を導入する（verification: `src/lib/runtime-paths.ts` を追加し、`app/api/agents/route.ts`・`src/lib/db.ts`・`src/lib/globals-env.ts` で利用）
- [x] 2. Agents/Globals/DB/Logs の参照先を `runtime/` 配下へ移行する（verification: `rg "process\.cwd\(\).*(agents|globals|data|logs)" app src scripts` が空、`src/lib/db.ts`・`src/lib/globals-env.ts`・`src/lib/launchd.ts`・`app/api/agents/*` が runtime パス参照）
- [x] 3. 既存環境向け移行処理を実装する（ディレクトリ移動、`agents.home` 更新、必要な launchd 再生成）（verification: `scripts/migrate-runtime.js` と `npm run migrate:runtime` を追加し、`node scripts/migrate-runtime.js --dry-run --verbose` 成功、`docs/design.md` §11.1 に手順反映）
- [x] 4. launchd 生成と起動フローを新パス構成に合わせる（verification: `src/lib/launchd.ts` が `runtime/globals/.env` を参照し、`tests/api/launchd.test.ts` の期待値を更新）
- [x] 5. ドキュメントと OpenSpec を更新し、構成・運用手順を一致させる（verification: `docs/requirements.md`・`docs/design.md`・`openspec/specs/launchd/spec.md`・`openspec/specs/hosting/spec.md` を `runtime/` 前提に更新）
- [x] 6. 回帰テストと主要操作確認を実施する（verification: `npm run typecheck && npm run test && npm run lint` が成功、API/UI 回帰テスト 124 件通過）

## Future Work

- `runtime/` の外部ストレージ化（NAS など）
- 環境ごとの runtime ルート切替（設定ファイル化）

## Acceptance #1 Failure Follow-up

- [x] `npm run start:prod` で DB マイグレーション（`scripts/migrate.ts` など）を実行してから Next.js サーバを起動するよう修正する（verification: `scripts/start-prod.sh` で `node scripts/migrate.js` を先行実行、`node scripts/migrate.js` 実行で `runtime/data/app.db` 初期化成功）
- [x] Hosting 仕様（`openspec/specs/hosting/spec.md`）に沿うことを検証するテストまたは運用検証手順を追加する（verification: `docs/design.md` §11.2 に起動/launchdログ/Caddy の運用検証手順を追加）
