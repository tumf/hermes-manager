## MODIFIED Requirements

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
