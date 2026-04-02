---
change_type: implementation
priority: medium
dependencies: []
references:
  - app/agents/[id]/page.tsx
  - src/components/agent-metadata-card.tsx
  - src/hooks/use-agent-meta.ts
  - docs/design.md
  - docs/requirements.md
---

# Move Metadata Edit to Dedicated Tab

**Change Type**: implementation

## Problem / Context

`/agents/:id` 詳細ページの共通部（タブの上）に `AgentMetadataCard` の編集フォーム（name / description / tags + Save ボタン）が常時表示されている。

これにより：

- ページ先頭の情報密度が高く、概要確認と編集操作が混在している
- タブ内の他の編集機能（Memory, Config, Env 等）と操作場所が分散している
- 画面を開くたびに編集フォームが目に入り、閲覧目的の場合にノイズになる

## Proposed Solution

### 共通部（タブ上部）を表示専用にする

- Display Name（未設定時は agentId をモノスペースで表示）— 現状維持
- agentId — 現状維持
- description（設定済みの場合のみテキスト表示）
- tags（設定済みの場合のみバッジ表示）
- HERMES_HOME（コピー可能）— 現状維持
- launchd ステータス＋操作ボタン — 現状維持
- **`AgentMetadataCard`（編集フォーム）を削除**

### 新規 `Metadata` タブを追加

タブ順序: **Metadata** / Memory / Config / Env / Skills / Cron / Chat / Logs

タブ内に `AgentMetadataCard` を配置し、name / description / tags の編集・保存を行う。
保存成功時、共通部の表示に即時反映される（既存の `useAgentMeta` フックがそのまま機能する）。

ハッシュ `#metadata` での直接遷移をサポート。

## Acceptance Criteria

1. `/agents/:id` の共通部に name / description / tags の編集フォームが表示されない
2. 共通部に name, description, tags が読み取り専用で表示される
3. `Metadata` タブで name / description / tags を編集・保存できる
4. 保存後、共通部の表示に即時反映される
5. `#metadata` でタブ直接遷移できる
6. デフォルトタブは `metadata`（ページ初期表示時）
7. 既存テストが通る（`npm run test && npm run typecheck && npm run lint`）

## Out of Scope

- API の変更（既存の `PUT /api/agents/[id]/meta` をそのまま利用）
- タグによるフィルタリング
- description の Markdown レンダリング
