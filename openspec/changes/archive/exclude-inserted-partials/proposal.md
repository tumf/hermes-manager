---
change_type: implementation
priority: medium
dependencies: []
references:
  - src/components/agent-memory-tab.tsx
  - app/api/partials/route.ts
  - src/lib/partials.ts
  - tests/ui/agent-detail-page.test.tsx
  - tests/api/partials.test.ts
  - openspec/specs/memory-tab/spec.md
  - openspec/specs/data-layer/spec.md
---

# Exclude already inserted shared partials from the Memory tab insert list

**Change Type**: implementation

## Problem / Context

Memory タブの partial mode では `共有パーシャルを挿入` リストから shared partial を選んで `SOUL.src.md` に `{{partial:name}}` を挿入できる。

しかし現在の UI は `/api/partials` が返す全 partial をそのまま表示しており、対象 agent の `SOUL.src.md` にすでに参照されている partial も再び挿入候補として表示される。`usedBy` はグローバルな利用状況の逆引きであり、現在編集中の agent にすでに挿入済みかどうかを UI が判定していない。

その結果、`/agents/:id#memory` で同じ partial を重複挿入しやすく、operator は「まだ未挿入の shared partial を選ぶ」つもりでも一覧から判別しづらい。multi-agent provisioning の観点でも、agent ごとの SOUL source を安全に組み立てる UI として、すでに組み込み済みの partial を候補から除外するほうが再現性と操作効率に合う。

## Proposed Solution

Memory タブの `共有パーシャルを挿入` UI で、現在の agent の `SOUL.src.md` にすでに参照されている partial を候補一覧から除外する。

- partial mode の SOUL source 内容から `{{partial:name}}` 参照を解析し、現在 agent に既挿入の partial 名集合を求める
- `/api/partials` が返す shared partial 一覧から、現在 agent の `SOUL.src.md` に既出の partial をクライアント側で除外して表示する
- partial 挿入直後は一覧も即時更新し、同じ partial が連続で再表示されないようにする
- partial mode でない agent や `SOUL.src.md` 未読込時の既存フローは維持する
- Memory タブ spec と UI テストに「既挿入 partial の非表示」を追加する

## Acceptance Criteria

- `/agents/:id#memory` の partial mode で `SOUL.src.md` が `{{partial:directory-structure}}` を含む場合、`共有パーシャルを挿入` リストに `directory-structure` は表示されない
- `/api/partials` 由来の他 partial は、現在 agent の `SOUL.src.md` に未挿入であれば引き続き表示される
- ユーザーが partial を 1 回挿入すると、その partial は同じ画面内で挿入直後に候補一覧から消える
- 既挿入 partial が全件である場合、Memory タブは空状態メッセージを表示し、重複挿入用の候補ボタンは表示しない
- partial 一覧 API の `usedBy` は既存どおりグローバル逆引きを返し、今回の変更のために API 契約を破壊しない

## Out of Scope

- 既挿入 partial を別セクションで「使用中」として表示する UI 追加
- `SOUL.src.md` 内での partial 並び替えや削除支援
- shared partial 自体の CRUD 仕様変更
