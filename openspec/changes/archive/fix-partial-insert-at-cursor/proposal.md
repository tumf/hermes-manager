---
change_type: implementation
priority: medium
dependencies: []
references:
  - src/components/agent-memory-tab.tsx
  - src/components/agent-file-editor.tsx
  - src/components/code-editor.tsx
  - tests/ui/agent-detail-page.test.tsx
  - openspec/specs/memory-tab/spec.md
  - openspec/changes/archive/add-soul-partials/specs/memory-tab/spec.md
---

# Fix shared partial insertion to use the current cursor position

**Change Type**: implementation

## Problem / Context

Memory タブの `Insert shared partial` UI は shared partial 参照を挿入できるが、現在は `\n{{partial:name}}\n` を末尾追加するだけで、エディタ上の現在のカーソル位置や選択範囲を尊重していない。

この挙動により、ユーザーが行中や特定位置へ partial を挿入したい場合でも、意図した位置に入らず、前後に不要な改行が強制される。セッション上の要望でも「`Insert shared partial` エディタにカーソルがあるときにはカーソル位置に挿入して」と明示されている。

関連実装を確認すると、`agent-memory-tab.tsx` は `insertText` を呼び出しているが、`agent-file-editor.tsx` の現在の `insertText` 実装は `content` 末尾への単純連結であり、CodeMirror の選択状態を利用していない。

## Proposed Solution

`Insert shared partial` による挿入を、現在のエディタ選択状態に基づく insertion/replace 動作へ変更する。

- shared partial 選択時の挿入トークンは `{{partial:<name>}}` のみとし、前後改行は自動追加しない
- FileEditor/CodeEditor の imperative API を拡張し、現在の selection/cursor に対してテキストを挿入できるようにする
- キャレットのみの場合はその位置に挿入し、選択範囲がある場合は partial トークンで置換する
- 既存の partial mode UI と toast フィードバックは維持する
- Memory タブの spec と UI テストを更新し、カーソル位置挿入・選択置換・改行非強制を明文化する

## Acceptance Criteria

- partial mode の SOUL エディタで `Insert shared partial` から partial を選ぶと、`{{partial:<name>}}` が現在のカーソル位置へ挿入される
- エディタに選択範囲がある場合、選択範囲は `{{partial:<name>}}` に置換される
- partial 挿入時に前後の改行は自動追加されない
- 挿入後、編集内容は dirty 状態として扱われ、既存の save/toast 動作は維持される
- Memory タブの UI テストは、partial 挿入後の editor content がカーソル位置または選択置換を反映することを検証する

## Out of Scope

- partial token 挿入時の自動整形や空白補完
- `Insert shared partial` 以外の編集操作 UX の見直し
- SOUL 以外のエディタ操作仕様変更
