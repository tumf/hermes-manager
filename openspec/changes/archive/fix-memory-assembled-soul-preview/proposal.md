---
change_type: implementation
priority: medium
dependencies: []
references:
  - src/components/agent-memory-tab.tsx
  - src/components/agent-file-editor.tsx
  - app/api/files/route.ts
  - src/lib/soul-assembly.ts
  - tests/ui/agent-detail-page.test.tsx
  - openspec/specs/memory-tab/spec.md
  - openspec/specs/file-editor/spec.md
---

# Fix Memory tab assembled SOUL preview behavior

**Change Type**: implementation

## Problem / Context

`/agents/:id#memory` の partial mode では `SOUL.src.md` を編集対象、`SOUL.md` を assembled preview として表示している。

現状の関連実装を見ると、`PUT /api/files` で `path=SOUL.src.md` を保存した場合、バックエンドは `SOUL.src.md` と assembled `SOUL.md` を両方更新している。一方で Memory タブの UI は assembled preview を保存成功後に再読込しておらず、画面上では `SOUL.md` が更新されていないように見える。

また assembled `SOUL.md` は preview 用に `readOnly` で表示されているが、`FileEditor` 側は read-only でも Save ボタンを描画するため、プレビューなのに保存 UI が見えてしまう。

## Proposed Solution

Memory タブの partial mode UX を、`SOUL.src.md` を唯一の編集対象、assembled `SOUL.md` を純粋なプレビューとして扱う仕様に揃える。

- `SOUL.src.md` 保存成功時、Memory タブは assembled `SOUL.md` preview を即座に再取得または再マウントして最新内容を表示する
- assembled `SOUL.md` 表示は preview-only 扱いにし、Save ボタンや unsaved 表示など保存前提の UI を出さない
- `FileEditor` に preview-only / save-success 通知の仕組みを追加し、read-only とは別に「保存 UI を持たないプレビュー表示」を表現できるようにする
- 既存の assembler API 契約（`SOUL.src.md` 保存時に `SOUL.md` を再生成する）は維持する
- Memory タブと FileEditor の spec を補強し、UI 側の同期責務と preview-only 挙動を明文化する

## Acceptance Criteria

- partial mode の Memory タブで `SOUL.src.md` を保存すると、同じ画面内の `SOUL.md (assembled)` preview が手動リロードなしで最新内容へ更新される
- `SOUL.src.md` 保存が 422 などで失敗した場合、assembled preview は成功時の内容に切り替わらない
- `SOUL.md (assembled)` は preview-only として表示され、Save ボタンを描画しない
- `SOUL.md (assembled)` は unsaved 状態表示やキーボード保存対象にならない
- legacy mode の `SOUL.md` 直接編集フロー、および `SOUL.src.md` 保存時に assembled `SOUL.md` を再生成する Files API 挙動は維持される

## Out of Scope

- partials 管理画面で partial を更新した際に、開いている Memory タブの assembled preview をライブ同期すること
- SOUL 以外の read-only viewer へ preview-only UI を一括適用すること
- assembler の展開ロジック自体の変更
