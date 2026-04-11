---
change_type: implementation
priority: medium
dependencies: []
references:
  - app/api/launchd/route.ts
  - src/lib/service-manager.ts
  - src/lib/agents.ts
  - tests/api/launchd.test.ts
  - openspec/specs/launchd/spec.md
---

# Refactor service lifecycle route

**Change Type**: implementation

## Problem / Context

- `app/api/launchd/route.ts` が request validation、service bootstrap、port 補完、start/stop/restart/status の action 分岐、polling まで 324 行で抱えており、route handler が orchestration と platform detail の両方を持っている。
- `install` / `start` / `restart` で `ensureServiceBootstrapped()` と API server port 補完が繰り返され、状態遷移エラー時の扱いを変更しづらい。
- route に近い層で `fs` 書き込み、polling、service command 組み立てが混在しているため、platform adapter の境界が曖昧になっている。

## Evidence

- `app/api/launchd/route.ts:82` に bootstrap と service definition 書き込みがあり、route 自身が install orchestration を持っている。
- `app/api/launchd/route.ts:173` 以降で `install` / `start` / `restart` のたびに port 補完と bootstrap 前提を手動で分岐している。
- `app/api/launchd/route.ts:53` の polling と `app/api/launchd/route.ts:310` の status 正規化も route 内に残っている。

## Proposed Solution

- service lifecycle route は request/response と zod validation に集中させ、bootstrap・port 補完・state polling・action 実行を専用 orchestration helper へ分離する。
- `install` / `start` / `restart` の共通前処理を統一し、platform adapter を跨いだ状態遷移ロジックを一箇所で扱う。
- characterization test を追加して、既存の `/api/launchd` 互換レスポンス、error code、manager フィールド、running/pid/timedOut の契約を固定する。

## Acceptance Criteria

- `/api/launchd` の request/response 仕様と互換パスは維持される。
- `install` / `start` / `restart` における API server port 補完と bootstrap の現行挙動は不変である。
- route handler から platform orchestration が切り出され、主要な状態遷移は unit test で検証できる。
- `npm run test`、`npm run typecheck`、`npm run lint` が通過する。

## Out of Scope

- `/api/launchd` を別 URL に変更すること
- service manager adapter の機能追加
- launchd/systemd の運用仕様変更
