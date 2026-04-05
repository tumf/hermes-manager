## MODIFIED Requirements

### Requirement: Memory tab inserts shared partial references into SOUL source

When an agent edits SOUL through partial mode, the Memory tab must insert shared partial references into the active SOUL source editor at the user's current selection state instead of forcing append-only newline-wrapped insertion.

#### Scenario: Insert a shared partial reference at the current cursor position

**Given**: 対象 agent が partial mode で SOUL を編集している
**And**: shared partial `directory-structure` が存在する
**And**: ユーザーのカーソルが SOUL source エディタ内の任意位置にある
**When**: ユーザーが partial 挿入 UI から `directory-structure` を選択する
**Then**: エディタはそのカーソル位置へ `{{partial:directory-structure}}` を挿入する
**And**: システムは partial 挿入の前後に改行を自動追加しない

#### Scenario: Replace the current selection with a shared partial reference

**Given**: 対象 agent が partial mode で SOUL を編集している
**And**: shared partial `directory-structure` が存在する
**And**: ユーザーが SOUL source エディタ内で既存テキスト範囲を選択している
**When**: ユーザーが partial 挿入 UI から `directory-structure` を選択する
**Then**: 選択範囲は `{{partial:directory-structure}}` に置換される
**And**: partial 挿入後のエディタ内容は未保存変更として扱われる
