---
change_type: implementation
priority: high
dependencies: []
references:
  - docs/requirements.md
  - docs/design.md
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

# update-memory-files-and-drop-agents-md

**Change Type**: implementation

## Problem / Context

- ユーザー要件として、本アプリでは `AGENTS.md` を扱わず、Memory タブの対象を見直したい。
- 直近の会話では A案が選択されており、`AGENTS.md` は廃止しつつ、`SOUL.md` は維持し、さらに `HERMES_HOME` 直下の `MEMORY.md` と `USER.md` を Memory タブに追加する前提が示されている。
- 現行仕様と実装は `AGENTS.md` / `SOUL.md` の2ファイル前提で、`MEMORY.md` / `USER.md` は未対応である。
- 新規 agent 作成、Files API、Templates、OpenAPI、テスト、OpenSpec も `AGENTS.md` を含む前提で揃っているため、Memory タブ単体ではなく一貫した仕様更新が必要である。

## Proposed Solution

- Memory タブの対象ファイルを `MEMORY.md` / `USER.md` / `SOUL.md` の3ファイルに変更し、`AGENTS.md` は UI・API・テンプレート・scaffold 対象から除外する。
- `/api/files` の許可ファイルを `MEMORY.md` / `USER.md` / `SOUL.md` / `config.yaml` に更新し、`AGENTS.md` への read/write を禁止する。
- 新規 agent 作成時の scaffold を `MEMORY.md` / `USER.md` / `SOUL.md` / `config.yaml` / `.env` / `logs/` に更新し、`AGENTS.md` は生成しない。
- Templates 機能は Memory 系テンプレート対象を `MEMORY.md` / `USER.md` / `SOUL.md` に再定義し、作成ダイアログ・保存・一覧・CRUD から `AGENTS.md` を除去する。
- 現行 canonical spec と関連ドキュメントを上記動作に合わせて更新し、OpenSpec・OpenAPI・tests の整合を取る。

## Acceptance Criteria

- `/agents/:id#memory` では `MEMORY.md` / `USER.md` / `SOUL.md` のいずれか1ファイルだけを表示し、未保存変更のある状態で切替しようとすると確認ダイアログが出る。
- `/api/files` は `AGENTS.md` を拒否し、`MEMORY.md` / `USER.md` / `SOUL.md` / `config.yaml` のみを受け付ける。
- `POST /api/agents` による新規作成で `runtime/agents/{id}/` 配下に `MEMORY.md` / `USER.md` / `SOUL.md` / `config.yaml` / `.env` / `logs/` が生成され、`AGENTS.md` は生成されない。
- テンプレート UI/API は `AGENTS.md` を表示・受理せず、Memory 系では `MEMORY.md` / `USER.md` / `SOUL.md` を選択・保存できる。
- canonical spec、proposal delta、OpenAPI、関連テストが新しいファイル構成に一致する。

## Out of Scope

- 既存の `runtime/agents/*/AGENTS.md` や既存テンプレート配下の `AGENTS.md` 実ファイルを自動削除する移行処理
- Hermes runtime 自体の `AGENTS.md` 解釈ロジック変更
