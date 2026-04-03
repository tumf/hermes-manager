## MODIFIED Requirements

### Requirement: Memory tab file display

Memory タブはエージェントのメモリファイル（`MEMORY.md`, `USER.md`, `SOUL.md`）を一度に1ファイルずつ表示し、明示的なファイル切替 UI で切り替える。`AGENTS.md` は Memory タブで扱わない。

#### Scenario: Default display shows MEMORY.md only

**Given**: エージェント詳細ページの Memory タブが表示されている
**When**: ページが初期表示される
**Then**: `MEMORY.md` のエディタのみが表示され、`USER.md` と `SOUL.md` のエディタは表示されない

#### Scenario: Switch to USER.md

**Given**: `MEMORY.md` が表示されている
**When**: `USER.md` ボタンをクリックする
**Then**: `USER.md` のエディタが表示され、`MEMORY.md` のエディタは非表示になる

#### Scenario: Switch to SOUL.md

**Given**: `MEMORY.md` が表示されている
**When**: `SOUL.md` ボタンをクリックする
**Then**: `SOUL.md` のエディタが表示され、`MEMORY.md` のエディタは非表示になる

#### Scenario: Confirm before switching with unsaved changes

**Given**: `MEMORY.md` が表示され、内容が編集されている（未保存）
**When**: `USER.md` または `SOUL.md` ボタンをクリックする
**Then**: 確認ダイアログが表示される

#### Scenario: Cancel switching preserves current file

**Given**: 確認ダイアログが表示されている
**When**: キャンセルを選択する
**Then**: `MEMORY.md` のエディタが表示されたまま、切替先ファイルは読み込まれない

#### Scenario: Save targets currently selected memory file

**Given**: ユーザーが Memory タブで `USER.md` を表示している
**When**: 保存を実行する
**Then**: クライアントは `/api/files` に `path=USER.md` を送信する
**And**: 同じ操作で `MEMORY.md` や `SOUL.md` の保存リクエストは送信されない
