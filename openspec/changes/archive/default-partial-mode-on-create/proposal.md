---
change_type: implementation
priority: medium
dependencies: []
references:
  - docs/requirements.md
  - docs/design.md
  - app/api/agents/route.ts
  - app/api/agents/[id]/route.ts
  - src/lib/agents.ts
  - src/lib/templates.ts
  - src/components/agent-memory-tab.tsx
  - tests/api/agents.test.ts
  - tests/ui/agents-page.test.tsx
  - openspec/changes/archive/add-soul-partials/proposal.md
  - openspec/changes/archive/add-soul-partials/specs/memory-tab/spec.md
---

# Default new agents to shared partial mode

**Change Type**: implementation

## Problem / Context

現在の新規 agent 作成フローは `SOUL.md` のみを生成し、結果として新規 agent は legacy direct-edit mode で開始される。一方、既存仕様では partial mode をサポートしており、`SOUL.src.md` が存在する agent は source-based editing と assembled `SOUL.md` の運用が可能である。

この差により、新規 agent 作成後に shared partial を前提とした運用へ移行するには追加の有効化操作が必要になり、初期状態の UX と推奨運用が一致しない。また、shared partial を標準運用にしたい場合でも、新規作成時点では partial mode 判定が false になるため、Memory タブの初期挙動が legacy 表示になる。

## Proposed Solution

新規 agent 作成時のデフォルト SOUL 管理方式を partial mode に変更する。

- `POST /api/agents` は新規 agent 作成時に `SOUL.src.md` を生成する
- 新規作成時の SOUL テンプレート解決結果は `SOUL.src.md` の初期内容として保存する
- 作成時に `SOUL.src.md` を assemble して `SOUL.md` も同時生成する
- agent 詳細 API と Memory タブでは、新規 agent が初回から `partialModeEnabled=true` として扱われる
- 既存 agent の legacy mode 挙動と「Enable Partials」による移行フローは維持する

今回の変更は「新規作成デフォルト」のみを対象とし、既存 agent の自動移行や partial テンプレート UI の全面見直しは含めない。

## Acceptance Criteria

- `POST /api/agents` で作成された新規 agent は `SOUL.src.md` と `SOUL.md` の両方を持つ
- 新規 agent の `SOUL.src.md` には、選択された SOUL テンプレートまたは default/fallback テンプレート内容が保存される
- 新規 agent の `SOUL.md` は、作成時点の `SOUL.src.md` を assemble した内容になる
- 新規 agent に対する `/api/agents/{id}` は `partialModeEnabled=true` を返す
- Memory タブは新規 agent で `SOUL.src.md` を編集対象として表示し、assembled `SOUL.md` 確認 UI を利用できる
- `SOUL.src.md` を持たない既存 agent は従来どおり legacy mode のまま動作する
- 既存の partial mode 有効化フローは後方互換のため維持される

## Out of Scope

- 既存 agent への一括移行
- テンプレート UI 文言を `SOUL.src.md` 前提へ変更すること
- `memories/MEMORY.md` や `memories/USER.md` への partial mode 拡張
- shared partial 自体の仕様変更
