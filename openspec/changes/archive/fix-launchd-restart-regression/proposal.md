---
change_type: implementation
priority: high
dependencies: []
references:
  - src/lib/service-lifecycle.ts
  - src/lib/launchd-adapter.ts
  - app/api/launchd/route.ts
  - tests/api/launchd-route.test.ts
  - openspec/specs/launchd/spec.md
  - openspec/specs/launchd-restart/spec.md
  - openspec/specs/service-lifecycle-route/spec.md
  - openspec/changes/archive/fix-hosting-launchd-bootstrap-errors/proposal.md
  - openspec/changes/archive/refactor-service-lifecycle-route/proposal.md
---

# Fix launchd restart regression

**Change Type**: implementation

## Premise / Context

- ユーザ報告では、running 状態の agent を reboot/restart すると `Bootstrap failed: 5: Input/output error` が出て、そのまま起動失敗する。
- 現行 `src/lib/service-lifecycle.ts` は `restart` でも `ensureServiceBootstrapped()` を呼び、launchd 既登録 service に対して `bootout -> bootstrap` を再実行している。
- archive 済みの `fix-hosting-launchd-bootstrap-errors` と current `openspec/specs/launchd/spec.md` は、macOS restart/reload が不要な re-bootstrap に依存してはならないと定義している。
- `refactor-service-lifecycle-route` で lifecycle orchestration が helper に抽出された際、過去に route 側で改善されていた safer restart semantics が回帰した疑いが強い。
- 一方で、ユーザは plist の動的生成自体は今後も必要であり、Web UI に専用の「plist 更新」操作を追加する方向は望んでいない。

## Problem / Context

- macOS launchd restart フローが、既登録・running service の再起動時にも service definition reconciliation と再登録を一体で扱っている。
- その結果、`restart` が既存 service を先に `bootout` し、続く `bootstrap` に失敗した場合、直前まで動いていた agent が停止したまま残る。
- この挙動は operator workflow として危険であり、multi-agent operations の lifecycle safety に反する。
- 既存 test は HTTP response 形状を固定しているが、「restart が既登録 service を不要に unbootstrap しないこと」を検証しておらず、回帰を捕捉できていない。

## Proposed Solution

- `restart` の macOS launchd semantics を、既登録 service の安全な再起動を優先するフローへ戻す。
- service definition / plist の動的生成は継続するが、それを既登録 running service に対する無条件の `bootout -> bootstrap` と同一視しない。
- `install` / `start` と `restart` の orchestration 境界を spec と helper 実装で明示し、restart failure が直前まで running だった service を不必要に未登録状態へ落とさないようにする。
- regression test を追加し、restart action が launchd 上の既登録 service に対して re-bootstrap 前提で動かないことを固定する。

## Acceptance Criteria

1. macOS 上で既登録かつ running の agent に対する `restart` は、不要な `launchctl bootstrap` の再実行を前提としない。
2. `restart` 中に plist / service definition の最新化が必要でも、失敗時に直前まで running だった service を単に re-bootstrap 失敗のためだけに停止状態へ落とさない。
3. `install` / `start` / `restart` のうち、port backfill と service definition generation は必要に応じて継続されるが、restart の launchd 反映方法は install/register とは別 phase として扱われる。
4. regression test が、running service restart 時に不要な `bootout -> bootstrap` を経由しないこと、また restart semantics の安全性を検証する。
5. `python3 ~/.agents/skills/cflx-proposal/scripts/cflx.py validate fix-launchd-restart-regression --strict` が通過する。

## Out of Scope

- Linux systemd restart semantics の変更
- ユーザに明示的な「plist 更新」専用 UI アクションを追加すること
- 既存 launchd 登録状態を各開発マシンで自動修復する migration
