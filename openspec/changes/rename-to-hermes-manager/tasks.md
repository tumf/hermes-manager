## Implementation Tasks

- [ ] 主要仕様と文書の rename 対象を `Hermes Manager` / `hermes-manager` / 新 service label / 新 URL に整理する（verification: manual - proposal/spec delta が README, docs, OpenAPI, hosting, OpenSpec を網羅していることをレビュー）
- [ ] repository / package / product naming の変更方針を docs/documentation capability に反映する（verification: manual - `openspec/changes/rename-to-hermes-manager/specs/documentation/spec.md`）
- [ ] app shell / UI chrome 上のアプリ名称変更要件を spec 化する（verification: manual - `openspec/changes/rename-to-hermes-manager/specs/app-shell/spec.md`）
- [ ] hosting artifact / service label / public URL rename 要件を spec 化する（verification: manual - `openspec/changes/rename-to-hermes-manager/specs/hosting/spec.md`）
- [ ] strict validation を通す（verification: manual - `python3 /Users/tumf/.agents/skills/cflx-proposal/scripts/cflx.py validate rename-to-hermes-manager --strict`）

## Future Work

- GitHub repository slug を実際に rename する
- `hermes-manager.mini.tumf.dev` 用の DNS/Caddy/証明書を切り替える
- launchd/systemd の既存インストールを新 label / 新ファイル名へ移行する
