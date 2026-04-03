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
