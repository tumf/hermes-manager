---
change_type: implementation
priority: high
dependencies: []
references:
  - openspec/changes/archive/update-memory-files-and-drop-agents-md/
  - openspec/specs/memory-tab/spec.md
  - openspec/specs/data-layer/spec.md
  - openspec/specs/agent-management/spec.md
  - openspec/specs/agent-templates/spec.md
  - src/components/agent-memory-tab.tsx
  - app/api/files/route.ts
  - app/api/agents/route.ts
  - src/lib/agents.ts
  - src/lib/templates.ts
---

# fix-memory-file-paths-and-order

**Change Type**: implementation

## Problem / Context

- 先行 proposal `update-memory-files-and-drop-agents-md` は archive 済みだが、`MEMORY.md` / `USER.md` のファイルパスが誤っていた。
  - 実際のパス: `HERMES_HOME/memories/MEMORY.md`, `HERMES_HOME/memories/USER.md`
  - 先行 proposal が想定していたパス: `HERMES_HOME/MEMORY.md`, `HERMES_HOME/USER.md`（直下）
- さらに Memory タブの表示順が `SOUL.md` 先頭ではなかった。ユーザー要件: `SOUL.md` を最初に表示する。
- `SOUL.md` は `HERMES_HOME` 直下のままで正しい。
- 現行の実装・canonical spec はまだ `AGENTS.md` / `SOUL.md` の2ファイル前提のまま。

## Proposed Solution

以下を正しいパス・表示順で一貫して実装する。

### Memory タブ対象ファイル（表示順）

1. `SOUL.md`（パス: `HERMES_HOME/SOUL.md`）
2. `MEMORY.md`（パス: `HERMES_HOME/memories/MEMORY.md`）
3. `USER.md`（パス: `HERMES_HOME/memories/USER.md`）

### Files API

- 許可パスを `SOUL.md`, `memories/MEMORY.md`, `memories/USER.md`, `config.yaml` に変更
- `AGENTS.md` への read/write は拒否

### Agent 作成 scaffold

- `SOUL.md`, `memories/MEMORY.md`, `memories/USER.md`, `config.yaml`, `.env`, `logs/` を生成
- `AGENTS.md` は生成しない

### Templates

- テンプレート対象ファイルを `SOUL.md`, `memories/MEMORY.md`, `memories/USER.md`, `config.yaml` に再定義
- 作成ダイアログ・一覧・CRUD から `AGENTS.md` を除去

## Acceptance Criteria

1. `/agents/:id#memory` でデフォルト表示が `SOUL.md`、切替で `MEMORY.md` / `USER.md` を選べる
2. `MEMORY.md` の read/write は `HERMES_HOME/memories/MEMORY.md` を対象とする（`HERMES_HOME/MEMORY.md` ではない）
3. `USER.md` の read/write は `HERMES_HOME/memories/USER.md` を対象とする
4. `/api/files` は `AGENTS.md` を 400 で拒否する
5. `POST /api/agents` で `memories/` サブディレクトリが作成され、その下に `MEMORY.md` / `USER.md` が生成される
6. テンプレート UI/API は `AGENTS.md` を扱わず、新しい4ファイル構成（`SOUL.md`, `memories/MEMORY.md`, `memories/USER.md`, `config.yaml`）を受け付ける
7. canonical spec・OpenAPI・テストが新しい構成に一致する

## Out of Scope

- 既存 agent の `AGENTS.md` 実ファイルの自動削除
- Hermes runtime 自体の `AGENTS.md` 解釈変更
