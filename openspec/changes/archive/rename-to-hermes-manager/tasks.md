## Implementation Tasks

- [x] 主要仕様と文書の rename 対象を `Hermes Manager` / `hermes-manager` / 新 service label / 新 URL に整理する（verification: manual - proposal/spec delta が README, docs, OpenAPI, hosting, OpenSpec を網羅していることをレビュー）
- [x] repository / package / product naming の変更方針を docs/documentation capability に反映する（verification: manual - `openspec/changes/rename-to-hermes-manager/specs/documentation/spec.md`）
- [x] app shell / UI chrome 上のアプリ名称変更要件を spec 化する（verification: manual - `openspec/changes/rename-to-hermes-manager/specs/app-shell/spec.md`）
- [x] hosting artifact / service label / public URL rename 要件を spec 化する（verification: manual - `openspec/changes/rename-to-hermes-manager/specs/hosting/spec.md`）
- [x] strict validation を通す（verification: manual - `python3 /Users/tumf/.agents/skills/cflx-proposal/scripts/cflx.py validate rename-to-hermes-manager --strict`）

## Acceptance #1 Failure Follow-up

- [x] Implement the actual rename across the codebase (keeping `change_type: implementation`)
- [x] Rename `brand` in all 10 translation files (`src/lib/translations/*.ts`) from `Hermes Agents` to `Hermes Manager`
- [x] Rename `title` in `app/layout.tsx` from `Hermes Agents` to `Hermes Manager`
- [x] Rename product/repo references in all README files (README.md, README.ja.md, README.\*.md)
- [x] Rename references in `docs/design.md`, `docs/requirements.md`
- [x] Rename OpenAPI title/URL in `openapi.yaml`
- [x] Rename hosting artifacts (`hosting/README.md`, plist/service files renamed to `ai.hermes.manager.*`, Caddy config updated)
- [x] Rename references in `AGENTS.md`, `CONTRIBUTING.md`, `SECURITY.md`, `package.json`, `.env.example`, `.wt/setup`
- [x] Verify: typecheck passes, lint passes, 363 tests pass, build succeeds

## Acceptance #2 Failure Follow-up

- [x] Update `restart` script (line 4) to use new service label `ai.hermes.manager` instead of `ai.hermes.agents-webapp`

## Future Work

- GitHub repository slug を実際に rename する
- `hermes-manager.mini.tumf.dev` 用の DNS/Caddy/証明書を切り替える
- launchd/systemd の既存インストールを新 label / 新ファイル名へ移行する
