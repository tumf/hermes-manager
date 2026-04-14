## Implementation Tasks

- [x] `/api/launchd` route の現行分岐と共通前処理を整理し、route / orchestration helper / platform adapter の境界を定義する（verification: manual - `app/api/launchd/route.ts` と `openspec/specs/launchd/spec.md` の責務差分を確認する）
- [x] characterization test を先に追加し、install/start/stop/restart/status の既存 response shape と error handling を固定する（verification: automated - `npm run test -- tests/api/launchd-route.test.ts`）
- [x] bootstrap、API server port 補完、state polling を共通 helper へ移す方針を spec に反映し、route の互換責務を明確化する（verification: manual - `openspec/changes/refactor-service-lifecycle-route/specs/service-lifecycle-route/spec.md`）
- [x] strict validation を通す（verification: automated - `python3 ~/.hermes/skills/cflx-proposal/scripts/cflx.py validate refactor-service-lifecycle-route --strict`）

## Future Work

- service lifecycle orchestration を background job や他 API からも再利用できるよう抽象化する
- platform adapter ごとの polling / startup timeout を設定化する
