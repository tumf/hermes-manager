## MODIFIED Requirements

### Requirement: Memory tab inserts shared partial references into SOUL source

When an agent edits SOUL through partial mode, the Memory tab must insert shared partial references into the active SOUL source editor at the user's current selection state instead of forcing append-only newline-wrapped insertion. The insertable partial list must exclude shared partials that are already referenced by the current agent's `SOUL.src.md`.

#### Scenario: Hide already inserted shared partials from the insert list

**Given**: 対象 agent が partial mode で SOUL を編集している
**And**: `SOUL.src.md` already contains `{{partial:directory-structure}}`
**And**: shared partials `directory-structure` and `security-rules` exist
**When**: ユーザーが Memory タブの `共有パーシャルを挿入` UI を確認する
**Then**: `directory-structure` は候補ボタンとして表示されない
**And**: `security-rules` は候補ボタンとして表示される

#### Scenario: Inserted partial disappears from the candidate list immediately

**Given**: 対象 agent が partial mode で SOUL を編集している
**And**: shared partial `directory-structure` が存在する
**And**: `directory-structure` is not yet referenced in `SOUL.src.md`
**When**: ユーザーが partial 挿入 UI から `directory-structure` を選択する
**Then**: エディタは `{{partial:directory-structure}}` を挿入する
**And**: 同じ画面内の `共有パーシャルを挿入` リストから `directory-structure` は直ちに消える

#### Scenario: Show empty state when all shared partials are already inserted

**Given**: 対象 agent が partial mode で SOUL を編集している
**And**: すべての shared partial が現在の `SOUL.src.md` で参照されている
**When**: ユーザーが Memory タブの `共有パーシャルを挿入` UI を確認する
**Then**: 候補ボタンは1件も表示されない
**And**: no-partials empty state message is displayed
