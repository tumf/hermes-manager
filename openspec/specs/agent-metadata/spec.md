# Agent Metadata

## Purpose

`meta.json` を通じて agent のユーザ管理 metadata と `apiServerPort` を保持する。

## Requirements

### Requirement: Default metadata values

The system SHALL derive agent metadata from `runtime/agents/{agentId}/meta.json`, using safe defaults when the file is absent.

#### Scenario: meta.json exists

- GIVEN `runtime/agents/{agentId}/meta.json` が存在する
- WHEN agent 情報を読み出す
- THEN `name`, `description`, `tags`, `apiServerPort` をその内容から返す

#### Scenario: meta.json is absent

- GIVEN `runtime/agents/{agentId}/meta.json` が存在しない
- WHEN agent 情報を読み出す
- THEN `name` は空文字、`description` は空文字、`tags` は空配列、`apiServerPort` は `null` 相当で扱う

### Requirement: Update metadata by API

The system SHALL allow metadata updates through `PUT /api/agents/{id}/meta` without losing an existing `apiServerPort`.

#### Scenario: Update user-managed metadata

- GIVEN agent `abc1234` が存在する
- WHEN `PUT /api/agents/abc1234/meta` に `name`, `description`, `tags` を送る
- THEN 200 を返す
- AND `meta.json` の該当項目を更新する

#### Scenario: Preserve existing apiServerPort on metadata update

- GIVEN agent `abc1234` の `meta.json.apiServerPort` が `8647` である
- WHEN `PUT /api/agents/abc1234/meta` で `name`, `description`, `tags` のみを更新する
- THEN レスポンスの `apiServerPort` は `8647` のままである
- AND 既存の `apiServerPort` は失われない

#### Scenario: Update rejects unknown agent

- GIVEN agent が存在しない
- WHEN `PUT /api/agents/{id}/meta` を呼び出す
- THEN 404 を返す
