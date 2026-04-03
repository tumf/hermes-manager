## Requirements

### Requirement: Memory tab file display

Memory タブはエージェントのメモリファイル（MEMORY.md, USER.md, SOUL.md）を一度に1ファイルずつ表示し、ファイル切替ボタンで切り替える。AGENTS.md は Memory タブで扱わない。

#### Scenario: Default display shows MEMORY.md only

**Given**: エージェント詳細ページの Memory タブが表示されている
**When**: ページが初期表示される
**Then**: MEMORY.md のエディタのみが表示され、USER.md と SOUL.md のエディタは表示されない

#### Scenario: Switch to USER.md

**Given**: MEMORY.md が表示されている
**When**: USER.md ボタンをクリックする
**Then**: USER.md のエディタが表示され、MEMORY.md のエディタは非表示になる

#### Scenario: Confirm before switching with unsaved changes

**Given**: MEMORY.md が表示され、内容が編集されている（未保存）
**When**: USER.md ボタンをクリックする
**Then**: 確認ダイアログが表示される

#### Scenario: Cancel switching preserves current file

**Given**: 確認ダイアログが表示されている
**When**: キャンセルを選択する
**Then**: MEMORY.md のエディタが表示されたまま、USER.md は読み込まれない
