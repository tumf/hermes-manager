## MODIFIED Requirements

### Requirement: Memory tab file display

Memory タブは `SOUL.md`, `memories/MEMORY.md`, `memories/USER.md` を一度に1ファイルずつ表示し、SOUL については legacy direct-edit mode と partial-enabled source mode の両方を扱えるようにする。`AGENTS.md` は Memory タブで扱わない。partial mode では `SOUL.src.md` を唯一の編集対象とし、assembled `SOUL.md` は preview-only として表示しなければならない。

#### Scenario: Partial-mode SOUL save refreshes assembled preview

**Given**: エージェント詳細ページの Memory タブが表示されている
**And**: 対象 agent に `SOUL.src.md` が存在する
**And**: SOUL セクションで `SOUL.src.md` 編集 UI と `SOUL.md (assembled)` preview UI が表示されている
**When**: ユーザーが `SOUL.src.md` の変更を保存する
**Then**: 同じ画面内の `SOUL.md (assembled)` preview は保存成功後の assembled 内容へ更新される
**And**: ユーザーは手動リロードやタブ再訪を要求されない

#### Scenario: Assembled preview remains unchanged when source save fails

**Given**: エージェント詳細ページの Memory タブが partial mode で表示されている
**And**: `SOUL.md (assembled)` preview に直前の assembled 内容が表示されている
**When**: ユーザーが invalid partial reference を含む `SOUL.src.md` を保存して失敗する
**Then**: `SOUL.md (assembled)` preview は失敗した内容へ切り替わらない
**And**: 画面上の assembled preview は最後に成功した assembled 内容を維持する
