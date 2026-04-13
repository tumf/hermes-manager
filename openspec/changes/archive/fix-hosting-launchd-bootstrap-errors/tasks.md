## Implementation Tasks

- [x] `hosting/ai.hermes.manager.plist` の固定 `WorkingDirectory` / `StandardOutPath` / `StandardErrorPath` を現行 repo 配置へ更新する（verification: manual - `hosting/ai.hermes.manager.plist` を確認し `/Users/tumf/services/hermes-agents` と `runtime/logs/*.log` を参照する）
- [x] `hosting/README.md` と関連 hosting 文書を更新し、初回 install の `launchctl bootstrap` と既登録 service の restart/reload の `launchctl kickstart -kp` を明確に分離する（verification: manual - `hosting/README.md` の macOS セクションで install/reload 手順が区別されていることを確認する）
- [x] `openspec/changes/fix-hosting-launchd-bootstrap-errors/specs/hosting/spec.md` で macOS hosting artifact のパス整合性と restart semantics を規定する（verification: manual - spec delta に rename 後 path と restart/reload 運用が含まれることを確認する）
- [x] `openspec/changes/fix-hosting-launchd-bootstrap-errors/specs/launchd/spec.md` で既登録 service の restart が不要な re-bootstrap を前提にしないことを規定する（verification: manual - spec delta に launchd restart/reload の期待動作が含まれることを確認する）
- [x] strict validation を通す（verification: manual - `python3 /Users/tumf/.agents/skills/cflx-proposal/scripts/cflx.py validate fix-hosting-launchd-bootstrap-errors --strict`）

## Future Work

- 各運用端末で既に登録済みの launchd plist を再配置し直す手順を配布する
- 必要であれば `/api/launchd` 実装変更を別 proposal として分離し、restart/install の orchestration を code でも stricter にする
