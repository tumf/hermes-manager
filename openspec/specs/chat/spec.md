# Chat

## Purpose

agent の `api_server` へ SSE proxy で接続し、session/message の参照 API と合わせて Chat UI の外部契約を定義する。

## Requirements

### Requirement: Stream chat via api_server

The system SHALL proxy user messages to the agent's resolved localhost `api_server` endpoint and stream the upstream SSE response back to the client.

#### Scenario: Stream a valid chat request

- GIVEN agent `alpha` が存在し `apiServerStatus=connected` かつ `apiServerPort=19001` である
- WHEN `POST /api/agents/alpha/chat` に `{ "message": "hello" }` を送る
- THEN WebApp は `http://127.0.0.1:19001/v1/chat/completions` に POST する
- AND `Content-Type: text/event-stream` で upstream body を返す

#### Scenario: Invalid request body is rejected

- GIVEN `message` が空文字または不正である
- WHEN `POST /api/agents/{id}/chat` を呼び出す
- THEN 400 を返す

#### Scenario: Unknown agent is rejected

- GIVEN agent が存在しない
- WHEN `POST /api/agents/{id}/chat` を呼び出す
- THEN 404 を返す

### Requirement: Refuse chat when api_server is unavailable

The system SHALL return a 503 with status detail when the agent does not have a usable connected api_server port.

#### Scenario: Configured but restart required

- GIVEN agent の `apiServerStatus` が `configured-needs-restart` で `apiServerPort` がない
- WHEN `POST /api/agents/{id}/chat` を呼び出す
- THEN 503 を返す
- AND body は `error: "api_server not available"` と `apiServerStatus` と理由文を含む

#### Scenario: Connected status without a usable port

- GIVEN `apiServerStatus=connected` だが `apiServerPort` が `null` である
- WHEN `POST /api/agents/{id}/chat` を呼び出す
- THEN 503 を返す

### Requirement: Abort upstream stream on client disconnect

The system SHALL propagate request abort to the upstream fetch.

#### Scenario: Client disconnect aborts upstream

- GIVEN Chat API が upstream SSE を処理中である
- WHEN クライアント接続が切断される
- THEN upstream fetch の abort signal が発火する
