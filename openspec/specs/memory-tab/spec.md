## Requirements

### Requirement: Memory tab file display

Memory タブはエージェントのメモリファイル（`SOUL.md`, `memories/MEMORY.md`, `memories/USER.md`）を一度に1ファイルずつ表示し、明示的なファイル切替 UI で切り替える。`AGENTS.md` は Memory タブで扱わない。

#### Scenario: Default display shows SOUL.md only

**Given**: エージェント詳細ページの Memory タブが表示されている
**When**: ページが初期表示される
**Then**: `SOUL.md` のエディタのみが表示され、`memories/MEMORY.md` と `memories/USER.md` のエディタは表示されない

#### Scenario: Switch to memories/MEMORY.md

**Given**: `SOUL.md` が表示されている
**When**: `memories/MEMORY.md` ボタンをクリックする
**Then**: `memories/MEMORY.md` のエディタが表示され、`SOUL.md` のエディタは非表示になる

#### Scenario: Switch to memories/USER.md

**Given**: `SOUL.md` が表示されている
**When**: `memories/USER.md` ボタンをクリックする
**Then**: `memories/USER.md` のエディタが表示され、`SOUL.md` のエディタは非表示になる

#### Scenario: Confirm before switching with unsaved changes

**Given**: `SOUL.md` が表示され、内容が編集されている（未保存）
**When**: `memories/MEMORY.md` または `memories/USER.md` ボタンをクリックする
**Then**: 確認ダイアログが表示される

#### Scenario: Cancel switching preserves current file

**Given**: 確認ダイアログが表示されている
**When**: キャンセルを選択する
**Then**: `SOUL.md` のエディタが表示されたまま、切替先ファイルは読み込まれない

#### Scenario: Save targets currently selected memory file

**Given**: ユーザーが Memory タブで `memories/USER.md` を表示している
**When**: 保存を実行する
**Then**: クライアントは `/api/files` に `path=memories/USER.md` を送信する
**And**: 同じ操作で `SOUL.md` や `memories/MEMORY.md` の保存リクエストは送信されない

### Requirement: Memory tab file display

Memory タブはエージェントのメモリファイル（`SOUL.md`, `memories/MEMORY.md`, `memories/USER.md`）を一度に1ファイルずつ表示し、明示的なファイル切替 UI で切り替える。`AGENTS.md` は Memory タブで扱わない。デフォルト表示は `SOUL.md` である。

#### Scenario: Default display shows SOUL.md only

**Given**: エージェント詳細ページの Memory タブが表示されている
**When**: ページが初期表示される
**Then**: `SOUL.md` のエディタのみが表示され、`memories/MEMORY.md` と `memories/USER.md` のエディタは表示されない

#### Scenario: Switch to memories/MEMORY.md

**Given**: `SOUL.md` が表示されている
**When**: `MEMORY.md` ボタンをクリックする
**Then**: `memories/MEMORY.md` のエディタが表示され、`SOUL.md` のエディタは非表示になる

#### Scenario: Switch to memories/USER.md

**Given**: `SOUL.md` が表示されている
**When**: `USER.md` ボタンをクリックする
**Then**: `memories/USER.md` のエディタが表示され、`SOUL.md` のエディタは非表示になる

#### Scenario: Confirm before switching with unsaved changes

**Given**: いずれかのメモリファイルが表示され、内容が編集されている（未保存）
**When**: 別のメモリファイルのボタンをクリックする
**Then**: 確認ダイアログが表示される

#### Scenario: Cancel switching preserves current file

**Given**: 確認ダイアログが表示されている
**When**: キャンセルを選択する
**Then**: 現在表示中のファイルのエディタが表示されたまま、切替先ファイルは読み込まれない

#### Scenario: Save targets currently selected memory file

**Given**: ユーザーが Memory タブで `memories/USER.md` を表示している
**When**: 保存を実行する
**Then**: クライアントは `/api/files` に `path=memories/USER.md` を送信する
**And**: 同じ操作で `SOUL.md` や `memories/MEMORY.md` の保存リクエストは送信されない

#### Scenario: File selector button order

**Given**: Memory タブが表示されている
**When**: ファイル切替ボタンの並び順を確認する
**Then**: 左から `SOUL.md`, `MEMORY.md`, `USER.md` の順で表示される

### Requirement: Memory tab file display

Memory タブは `SOUL.md`, `memories/MEMORY.md`, `memories/USER.md` を一度に1ファイルずつ表示し、SOUL については legacy direct-edit mode と partial-enabled source mode の両方を扱えるようにする。`AGENTS.md` は Memory タブで扱わない。

#### Scenario: Default display uses legacy SOUL editor when source file is absent

**Given**: エージェント詳細ページの Memory タブが表示されている
**And**: 対象 agent に `SOUL.src.md` が存在しない
**When**: ページが初期表示される
**Then**: `SOUL.md` のエディタのみが表示される
**And**: `memories/MEMORY.md` と `memories/USER.md` のエディタは表示されない
**And**: partial mode を有効化するための UI が表示される

#### Scenario: Default display uses SOUL source editor when source file exists

**Given**: エージェント詳細ページの Memory タブが表示されている
**And**: 対象 agent に `SOUL.src.md` が存在する
**When**: ページが初期表示される
**Then**: SOUL セクションでは `SOUL.src.md` を編集対象として表示する
**And**: assembled `SOUL.md` を確認する UI が利用できる

#### Scenario: Enable partial mode from an existing SOUL file

**Given**: 対象 agent に `SOUL.md` は存在し `SOUL.src.md` は存在しない
**When**: ユーザーが partial mode を有効化する
**Then**: 現在の `SOUL.md` 内容を元に `SOUL.src.md` が作成される
**And**: 以後の SOUL 編集対象は `SOUL.src.md` になる
**And**: 既存の `SOUL.md` は assembled output として維持される

#### Scenario: Insert a shared partial reference into SOUL source

**Given**: 対象 agent が partial mode で SOUL を編集している
**And**: shared partial `directory-structure` が存在する
**When**: ユーザーが partial 挿入 UI から `directory-structure` を選択する
**Then**: エディタへ `{{partial:directory-structure}}` が挿入される

#### Scenario: Save targets current memory file without cross-saving

**Given**: ユーザーが Memory タブで `memories/USER.md` を表示している
**When**: 保存を実行する
**Then**: クライアントは `/api/files` に `path=memories/USER.md` を送信する
**And**: 同じ操作で `SOUL.md`, `SOUL.src.md`, `memories/MEMORY.md` の保存リクエストは送信されない

### Requirement: Memory tab inserts shared partial references into SOUL source

When an agent edits SOUL through partial mode, the Memory tab must insert shared partial references into the active SOUL source editor at the user's current selection state instead of forcing append-only newline-wrapped insertion.

#### Scenario: Insert a shared partial reference at the current cursor position

**Given**: 対象 agent が partial mode で SOUL を編集している
**And**: shared partial `directory-structure` が存在する
**And**: ユーザーのカーソルが SOUL source エディタ内の任意位置にある
**When**: ユーザーが partial 挿入 UI から `directory-structure` を選択する
**Then**: エディタはそのカーソル位置へ `{{partial:directory-structure}}` をそのまま挿入する
**And**: システムは partial 挿入の前後に改行を自動追加しない（`{{partial:...}}` のようなラップは行わない）

#### Scenario: Replace the current selection with a shared partial reference

**Given**: 対象 agent が partial mode で SOUL を編集している
**And**: shared partial `directory-structure` が存在する
**And**: ユーザーが SOUL source エディタ内で既存テキスト範囲を選択している
**When**: ユーザーが partial 挿入 UI から `directory-structure` を選択する
**Then**: 選択範囲は `{{partial:directory-structure}}` に置換される
**And**: partial 挿入後のエディタ内容は未保存変更として扱われる
