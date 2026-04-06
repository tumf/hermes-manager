---
change_type: implementation
priority: medium
dependencies: []
references:
  - docs/design.md
  - docs/requirements.md
  - openspec/specs/agents-list/spec.md
  - openspec/specs/agent-detail/spec.md
  - src/components/agent-card.tsx
  - src/components/agents-list-content.tsx
  - app/agents/[id]/page.tsx
---

# Move Hermes version display to agent detail page

**Change Type**: implementation

## Problem / Context

トップの Agent 一覧は現在 Hermes バージョンを各行・カードに表示しているが、一覧としては情報密度が高く、詳細確認向けの情報まで常時表示している。さらに既存の詳細ページ仕様ではヘッダーに name / description / tags などはある一方で、Hermes バージョンの確認場所が UI 上で明確でない。

既存実装と仕様をユーザー要望に合わせて揃え、Hermes バージョンは Agent ごとの詳細ページで確認する構成へ寄せる必要がある。

## Proposed Solution

- Agents 一覧から Hermes バージョン表示を削除する
- Agent 詳細 `/agents/[id]` に Hermes バージョン表示を追加する
- 一覧の process-level 情報は Memory を維持し、Hermes バージョンは詳細情報として扱う
- spec / design / requirements を更新して UI の責務を明確化する

## Acceptance Criteria

- `/` の Agent 一覧テーブルに Hermes 列が表示されない
- `/` のモバイル Agent カードに Hermes バージョン表示が出ない
- `/agents/[id]` のヘッダー情報エリアで Hermes バージョンが表示される
- Hermes バージョンが取得できない agent では詳細ページで `--` を表示する
- 関連する OpenSpec とドキュメントが新しい UI 配置と整合する

## Out of Scope

- Hermes バージョン算出ロジック自体の変更
- Agent 一覧の Memory 表示や起動状態表示の再設計
- 新しい API フィールド追加や Hermes 実行方式の変更
