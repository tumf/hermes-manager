# File Editor

## Purpose

agent home 配下のメモリ・SOUL・設定ファイルを、安全に read/write する。

## Requirements

### Requirement: Read only whitelisted files

The system SHALL allow reads only for whitelisted paths under the agent home.

#### Scenario: Read an allowed file

- GIVEN agent `alpha` が存在し `SOUL.md` を持つ
- WHEN `GET /api/files?agent=alpha&path=SOUL.md` を呼び出す
- THEN 200 を返し `{ content: "..." }` を返す

#### Scenario: Unknown agent is rejected on read

- GIVEN agent が存在しない
- WHEN `GET /api/files?agent=ghost&path=SOUL.md` を呼び出す
- THEN 404 を返す

#### Scenario: Partial mode source is absent

- GIVEN agent が `SOUL.src.md` を持たない
- WHEN `GET /api/files?agent=alpha&path=SOUL.src.md` を呼び出す
- THEN 404 を返す

### Requirement: Validate writes and guard traversal

The system SHALL accept writes only for allowed paths, reject invalid YAML, and keep writes inside the agent home.

#### Scenario: Write legacy SOUL.md atomically

- GIVEN agent `alpha` は `SOUL.src.md` を持たない
- WHEN `PUT /api/files` に `{ "agent": "alpha", "path": "SOUL.md", "content": "# Soul\n" }` を送る
- THEN `.tmp` ファイルへ書いて rename する
- AND `{ ok: true }` を返す

#### Scenario: Invalid YAML is rejected

- GIVEN agent `alpha` が存在する
- WHEN `PUT /api/files` に `path=config.yaml` と不正 YAML を送る
- THEN 422 を返す

#### Scenario: Zero-width spaces are stripped before write

- GIVEN memory または SOUL source に zero-width space を含む content が送られる
- WHEN `PUT /api/files` を処理する
- THEN 保存前に zero-width space を除去する

### Requirement: Support legacy SOUL mode and partial mode

The system SHALL preserve direct `SOUL.md` editing for legacy agents and use `SOUL.src.md` plus assembly for partial mode agents. When `SOUL.md` is shown as the assembled view for a partial mode agent, that view SHALL be preview-only and SHALL NOT present save-oriented controls.

#### Scenario: Assembled SOUL view is preview-only in partial mode

- GIVEN agent `alpha` が `SOUL.src.md` を持つ
- AND UI が `SOUL.md` を assembled view として表示している
- WHEN ユーザーがその assembled view を確認する
- THEN assembled `SOUL.md` は read-only で表示される
- AND Save ボタンは表示されない
- AND unsaved 状態表示や保存ショートカット対象として扱われない

#### Scenario: Direct SOUL.md write is rejected in partial mode

- GIVEN agent `alpha` が `SOUL.src.md` を持つ
- WHEN `PUT /api/files` に `path=SOUL.md` を送る
- THEN 409 を返す

#### Scenario: Write SOUL source through assembler

- GIVEN agent `alpha` が partial mode である
- WHEN `PUT /api/files` に `path=SOUL.src.md` と partial 参照を含む content を送る
- THEN `SOUL.src.md` を更新する
- AND assembled `SOUL.md` を再生成する
- AND `{ ok: true }` を返す

#### Scenario: Unknown partial reference fails atomically

- GIVEN 参照 partial が存在しない
- WHEN `PUT /api/files` に `path=SOUL.src.md` を送る
- THEN 422 を返す
- AND `SOUL.src.md` と `SOUL.md` のどちらも更新しない

### Requirement: Support legacy SOUL mode and partial mode

The system SHALL preserve direct `SOUL.md` editing for legacy agents and use `SOUL.src.md` plus assembly for partial mode agents. When `SOUL.md` is shown as the assembled view for a partial mode agent, that view SHALL be preview-only and SHALL NOT present save-oriented controls.

#### Scenario: Assembled SOUL view is preview-only in partial mode

- GIVEN agent `alpha` が `SOUL.src.md` を持つ
- AND UI が `SOUL.md` を assembled view として表示している
- WHEN ユーザーがその assembled view を確認する
- THEN assembled `SOUL.md` は read-only で表示される
- AND Save ボタンは表示されない
- AND unsaved 状態表示や保存ショートカット対象として扱われない
