# Skills

## Purpose

`~/.agents/skills` をソースとして agent-local `skills/` ディレクトリへ copy-based に equip/unequip する。

## Requirements

### Requirement: Return the available skills tree

The system SHALL expose a hierarchical skills tree from `~/.agents/skills`, marking only directories that contain `SKILL.md` as selectable skills.

#### Scenario: Hidden entries and non-directories are ignored

- GIVEN skills root に hidden entry や非ディレクトリが含まれる
- WHEN `GET /api/skills/tree` を呼び出す
- THEN hidden entry と非ディレクトリは tree に含まれない

#### Scenario: Nested skill keeps relative path

- GIVEN `~/.agents/skills/openclaw-imports/refactor/SKILL.md` が存在する
- WHEN `GET /api/skills/tree` を呼び出す
- THEN `relativePath` は `openclaw-imports/refactor` として返る

#### Scenario: Missing skills root returns empty tree

- GIVEN `~/.agents/skills` が存在しない
- WHEN `GET /api/skills/tree` を呼び出す
- THEN 200 で空 tree を返す

### Requirement: Report equipped copied skills

The system SHALL determine equipped skills by scanning copied directories under `{agent.home}/skills`.

#### Scenario: Equipped copied skill is returned

- GIVEN `{agent.home}/skills/research/arxiv/SKILL.md` が存在する
- WHEN `GET /api/skills/links?agent=alice` を呼び出す
- THEN 200 を返す
- AND `relativePath: "research/arxiv"` と `exists: true` を含む

#### Scenario: Unknown agent is rejected on links read

- GIVEN agent が存在しない
- WHEN `GET /api/skills/links?agent=ghost` を呼び出す
- THEN 404 を返す

### Requirement: Equip a skill by copying from shared skills root

The system SHALL validate the requested relative path, ensure the source contains `SKILL.md`, and copy it into the agent home.

#### Scenario: Successful equip

- GIVEN `~/.agents/skills/research/arxiv/SKILL.md` が存在する
- AND agent `alice` が存在する
- WHEN `POST /api/skills/links` に `{ "agent": "alice", "relativePath": "research/arxiv" }` を送る
- THEN source directory を `{agent.home}/skills/research/arxiv` へ再帰コピーする
- AND `{ ok: true, relativePath: "research/arxiv" }` を返す

#### Scenario: Equip rejects source without SKILL.md

- GIVEN source directory に `SKILL.md` が存在しない
- WHEN `POST /api/skills/links` を呼び出す
- THEN 400 を返す

#### Scenario: Equip rejects duplicate copied skill

- GIVEN `{agent.home}/skills/research/arxiv` が既に存在する
- WHEN 同じ `relativePath` で `POST /api/skills/links` を呼び出す
- THEN 409 を返す

#### Scenario: Equip rejects traversal path

- GIVEN `relativePath` が skills root 外へ出ようとする
- WHEN `POST /api/skills/links` を呼び出す
- THEN 400 を返す

### Requirement: Unequip a skill by removing the copied directory

The system SHALL remove the copied skill directory and reject requests for unknown skills.

#### Scenario: Successful unequip

- GIVEN `{agent.home}/skills/research/arxiv` が存在する
- WHEN `DELETE /api/skills/links?agent=alice&path=research/arxiv` を呼び出す
- THEN コピー済みディレクトリを削除する
- AND 200 と `{ ok: true }` を返す

#### Scenario: Unknown copied skill returns 404

- GIVEN `{agent.home}/skills/research/arxiv` が存在しない
- WHEN `DELETE /api/skills/links?agent=alice&path=research/arxiv` を呼び出す
- THEN 404 を返す
