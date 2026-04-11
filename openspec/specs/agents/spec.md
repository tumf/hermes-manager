# Agents

## Purpose

Agent の作成、一覧、削除、コピー、および関連 metadata の返却を、`runtime/agents/{agentId}` をソース・オブ・トゥルースとして提供する。

## Requirements

### Requirement: List agents

The system SHALL return the current agent list from the runtime filesystem.

#### Scenario: Agent list includes user-visible metadata

- GIVEN runtime に 1 件以上の agent が存在する
- WHEN `GET /api/agents` を呼び出す
- THEN レスポンスは 200 である
- AND 各要素は `agentId`, `home`, `label`, `enabled`, `createdAt`, `name`, `description`, `tags`, `memoryRssBytes`, `hermesVersion` を含む

#### Scenario: No agents exist

- GIVEN runtime に agent が存在しない
- WHEN `GET /api/agents` を呼び出す
- THEN レスポンスは 200 で空配列を返す

### Requirement: Create agent

The system SHALL create a new agent with an auto-generated id and scaffold the standard runtime files.

#### Scenario: Create agent without request body

- GIVEN クライアントが本文なしで `POST /api/agents` を呼び出す
- WHEN サーバーが新規 agent を作成する
- THEN `[0-9a-z]{7}` 形式の一意な agent id を生成する
- AND テンプレート解決済みの `SOUL` / memory / config を使って agent home を初期化する
- AND 201 を返す

#### Scenario: Create agent with templates and metadata

- GIVEN クライアントが `templates` と `meta` を含む body を送る
- WHEN `POST /api/agents` を呼び出す
- THEN 指定テンプレートを優先して初期ファイルを作成する
- AND `meta.name`, `meta.description`, `meta.tags` を agent metadata に保存する
- AND 201 を返す

#### Scenario: Unique id generation fails repeatedly

- GIVEN 生成候補 id が既存 agent と衝突し続ける
- WHEN `POST /api/agents` を呼び出す
- THEN サーバーは 500 を返す

### Requirement: Delete agent

The system SHALL best-effort unload the launchd service for an agent before optionally purging its runtime directory.

#### Scenario: Delete without purge

- GIVEN 対象 agent が存在する
- WHEN `DELETE /api/agents?id=<agentId>` を呼び出す
- THEN `launchctl unload` を best-effort で実行する
- AND agent home は保持する
- AND `{ ok: true }` を返す

#### Scenario: Delete with purge

- GIVEN 対象 agent が存在する
- WHEN `DELETE /api/agents?id=<agentId>&purge=true` を呼び出す
- THEN `launchctl unload` を best-effort で実行する
- AND agent runtime directory を削除する
- AND `{ ok: true }` を返す

#### Scenario: Delete rejects unknown agent

- GIVEN 対象 agent が存在しない
- WHEN `DELETE /api/agents?id=<agentId>` を呼び出す
- THEN 404 を返す

### Requirement: Copy agent

The system SHALL deep-copy an existing agent into a new auto-generated agent id while allocating a fresh API server port.

#### Scenario: Copy existing agent

- GIVEN 既存 agent `delta11` が存在する
- WHEN `POST /api/agents/copy` に `{ "from": "delta11" }` を送る
- THEN 元 agent home を新しい agent home へ再帰コピーする
- AND 新しい agent id を払い出す
- AND 201 を返す

#### Scenario: Copy rejects unavailable source agent

- GIVEN コピー元 agent が存在しない
- WHEN `POST /api/agents/copy` を呼び出す
- THEN 404 を返す
