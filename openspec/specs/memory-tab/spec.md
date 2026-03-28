## Requirements

### Requirement: Memory tab file display

Memory タブはエージェントのメモリファイル（AGENTS.md, SOUL.md）を一度に1ファイルずつ表示し、サブタブで切り替える。

#### Scenario: Default display shows AGENTS.md only

**Given**: エージェント詳細ページの Memory タブが表示されている
**When**: ページが初期表示される
**Then**: AGENTS.md のエディタのみが表示され、SOUL.md のエディタは表示されない

#### Scenario: Switch to SOUL.md

**Given**: AGENTS.md が表示されている
**When**: SOUL.md ボタンをクリックする
**Then**: SOUL.md のエディタが表示され、AGENTS.md のエディタは非表示になる

#### Scenario: Confirm before switching with unsaved changes

**Given**: AGENTS.md が表示され、内容が編集されている（未保存）
**When**: SOUL.md ボタンをクリックする
**Then**: 確認ダイアログが表示される

#### Scenario: Cancel switching preserves current file

**Given**: 確認ダイアログが表示されている
**When**: キャンセルを選択する
**Then**: AGENTS.md のエディタが表示されたまま、SOUL.md は読み込まれない
