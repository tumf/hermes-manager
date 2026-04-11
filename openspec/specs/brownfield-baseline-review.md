# OpenSpec Brownfield Baseline Review

## Recommended first-wave domains

- `openspec/specs/agents/spec.md`
- `openspec/specs/agent-metadata/spec.md`
- `openspec/specs/api-server-port/spec.md`
- `openspec/specs/env-management/spec.md`
- `openspec/specs/globals/spec.md`
- `openspec/specs/file-editor/spec.md`
- `openspec/specs/skills/spec.md`
- `openspec/specs/chat/spec.md`

## Intended behavior confirmed

- Agent 作成は自動 id 採番で、body なしでも作成できる (`app/api/agents/route.ts`, `tests/api/agents.test.ts`)
- 新規作成と copy は `8642..8699` の未使用 `apiServerPort` を割り当てる (`app/api/agents/route.ts`, `docs/requirements.md`)
- agent/local env と globals は `visibility=plain|secure` を持ち、管理系 API では secure 値をマスクする (`app/api/env/route.ts`, `tests/api/env.test.ts`, `tests/api/globals.test.ts`)
- resolved env は global + agent をマージし、`global` / `agent` / `agent-override` を返す (`tests/api/env.test.ts:270`)
- file editor は partial mode で `SOUL.src.md` を編集し、unknown partial を 422 で拒否する (`app/api/files/route.ts`, `tests/api/files.test.ts`)
- skills は symlink ではなく copy-based equip/unequip を行う (`app/api/skills/links/route.ts`, `docs/design.md:100`)
- chat は hermes chat CLI ではなく agent の api_server に SSE proxy する (`app/api/agents/[id]/chat/route.ts`, `tests/api/chat.test.ts`)

## Inferred behavior needing review

- `DELETE /api/agents` は best-effort で `launchctl unload` を実行するが、実装は launchd 固定で、requirements/design にある Linux systemd 抽象とずれて見える
- `GET /api/agents` の返却項目は spec ごとに揺れやすく、`updatedAt` や `apiServerPort` が一覧 API の契約に入るかは再確認余地がある
- copy 時の metadata 詳細継承ルールは既存 spec と現行テストで完全一致が確認しきれていないため、人手レビューが必要

## Likely bugs or accidental behavior not promoted to spec

- 旧 spec に残っていた DB ベース記述、symlink ベース skills、`hermes chat` CLI ベース chat は現行コードと不一致のため baseline に昇格していない
- `DELETE /api/agents` の launchd 固定呼び出しは、現行 macOS 運用では成立するがクロスプラットフォーム契約としては未昇格

## Recommendation for future changes

- baseline は current-state source of truth として `openspec/specs/` を参照する
- 今後の機能追加・修正は必ず `openspec/changes/<change-id>/proposal.md`, `design.md`, `tasks.md`, `specs/...` で差分管理する
- 特に service control / sessions / partials / templates / cron は次の phase で domain ごとに baseline 化する
