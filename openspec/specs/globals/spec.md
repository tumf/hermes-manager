# Globals

## Purpose
`runtime/globals/.env` と `runtime/globals/.env.meta.json` を通じて、全 agent 共通の env 変数を管理する。

## Requirements

### Requirement: List globals with masking
The system SHALL return global env variables with secure values masked in management responses.

#### Scenario: No globals exist
- GIVEN `runtime/globals/.env` が空または未作成である
- WHEN `GET /api/globals` を呼び出す
- THEN 200 を返し空配列を返す

#### Scenario: Plain global value is visible
- GIVEN `.env` に `FOO=bar` があり `.env.meta.json` で `visibility=plain` である
- WHEN `GET /api/globals` を呼び出す
- THEN `FOO` は `value: "bar"`, `masked: false`, `scope: "global"` で返る

#### Scenario: Secure global value is masked
- GIVEN `.env` に `SECRET=token` があり `.env.meta.json` で `visibility=secure` である
- WHEN `GET /api/globals` を呼び出す
- THEN `SECRET` は `value: "***"`, `masked: true` で返る

### Requirement: Upsert globals and persist real values
The system SHALL upsert global env values, persist visibility metadata, and keep the actual value in `runtime/globals/.env`.

#### Scenario: Create a plain global variable
- GIVEN `FOO` が未作成である
- WHEN `POST /api/globals` に `{ "key": "FOO", "value": "bar", "visibility": "plain" }` を送る
- THEN 200 を返す
- AND `runtime/globals/.env` に `FOO=bar` を保存する
- AND レスポンスは `scope: "global"` を含む

#### Scenario: Create a secure global variable
- GIVEN `API_KEY` が未作成である
- WHEN `POST /api/globals` に `{ "key": "API_KEY", "value": "super-secret", "visibility": "secure" }` を送る
- THEN `runtime/globals/.env` には実値を保存する
- AND `.env.meta.json` には `visibility=secure` を保存する
- AND 管理レスポンスでは値を `***` で返す

#### Scenario: Update an existing global variable
- GIVEN `FOO=old` が存在する
- WHEN `POST /api/globals` に `{ "key": "FOO", "value": "new", "visibility": "secure" }` を送る
- THEN `runtime/globals/.env` の `FOO` は `new` に更新される
- AND 旧値は残らない

### Requirement: Delete globals
The system SHALL remove a global variable from both `.env` and its visibility metadata.

#### Scenario: Delete existing global variable
- GIVEN `BAZ=qux` が存在する
- WHEN `DELETE /api/globals?key=BAZ` を呼び出す
- THEN 200 を返す
- AND `runtime/globals/.env` から `BAZ=qux` を削除する

#### Scenario: Missing key query is rejected
- GIVEN `key` query がない
- WHEN `DELETE /api/globals` を呼び出す
- THEN 400 を返す
