# Environment Management

## Purpose

agent-local `.env` と resolved env view を、visibility metadata とともに管理する。

## Requirements

### Requirement: Read masked per-agent env variables

The system SHALL return agent-local env values with secure entries masked in management responses.

#### Scenario: Secure values are masked

- GIVEN agent `alpha` の `.env` に `API_KEY=secret` があり `.env.meta.json` で `visibility=secure` である
- WHEN `GET /api/env?agent=alpha` を呼び出す
- THEN 200 を返す
- AND `API_KEY` は `{ value: "***", masked: true, visibility: "secure" }` として返る

#### Scenario: Variables without metadata default to plain

- GIVEN `.env.meta.json` に記録されていない env key が存在する
- WHEN `GET /api/env?agent=alpha` を呼び出す
- THEN その key は `visibility: "plain"` かつ `masked: false` で返る

#### Scenario: Missing agent query is rejected

- GIVEN `agent` query がない
- WHEN `GET /api/env` を呼び出す
- THEN 400 を返す

### Requirement: Upsert per-agent env variables with visibility

The system SHALL upsert agent-local env entries and persist visibility in `.env.meta.json`.

#### Scenario: Create a secure variable

- GIVEN agent `alpha` が存在する
- WHEN `POST /api/env` に `{ "agent": "alpha", "key": "API_KEY", "value": "super-secret", "visibility": "secure" }` を送る
- THEN `.env` に実値 `API_KEY=super-secret` を保存する
- AND `.env.meta.json` に `API_KEY.visibility=secure` を保存する
- AND `{ ok: true, visibility: "secure" }` を返す

#### Scenario: Update visibility without replacing existing value

- GIVEN `.env` に `API_KEY=super-secret` が存在する
- WHEN `POST /api/env` に `{ "agent": "alpha", "key": "API_KEY", "visibility": "plain" }` を送る
- THEN 既存値は保持される
- AND visibility だけが更新される

#### Scenario: New key without value is rejected

- GIVEN key が未作成である
- WHEN `POST /api/env` に `value` なしで新規 key を送る
- THEN 400 を返す

### Requirement: Delete per-agent env variables

The system SHALL remove both the env entry and its visibility metadata.

#### Scenario: Delete existing variable

- GIVEN `.env` に `REMOVE_ME=yes` がある
- WHEN `DELETE /api/env?agent=alpha&key=REMOVE_ME` を呼び出す
- THEN `.env` から該当行を削除する
- AND `.env.meta.json` の visibility も削除する
- AND `{ ok: true }` を返す

#### Scenario: Delete rejects unknown agent

- GIVEN agent が存在しない
- WHEN `DELETE /api/env?agent=ghost&key=FOO` を呼び出す
- THEN 404 を返す

### Requirement: Return resolved env view

The system SHALL return the merged runtime values from global and agent-local env files without masking, annotated by source.

#### Scenario: Agent overrides global value

- GIVEN global `.env` に `BASE_URL=https://example.com` がある
- AND agent `.env` に `BASE_URL=https://override.example.com` と `API_KEY=secret` がある
- WHEN `GET /api/env/resolved?agent=alpha` を呼び出す
- THEN `BASE_URL` は `{ source: "agent-override", value: "https://override.example.com" }` で返る
- AND `API_KEY` は `{ source: "agent", value: "secret" }` で返る

#### Scenario: Global-only key is marked global

- GIVEN global `.env` にのみ `GLOBAL_VAR=gval` がある
- WHEN `GET /api/env/resolved?agent=alpha` を呼び出す
- THEN `GLOBAL_VAR` は `{ source: "global", value: "gval", visibility: "plain" }` で返る
