## ADDED Requirements

### Requirement: Batch status endpoint for agent services

トップページや fleet-oriented UI は、複数 agent の service status を 1 回の API 呼び出しで取得できなければならない。既存の単体 `/api/launchd` action API を壊さず、複数 agent の status 問い合わせをまとめて返せる batch endpoint を提供する。

#### Scenario: Batch status request returns multiple agent statuses

**Given**: `alpha11` と `beta222` の 2 つの agent が存在する
**When**: `POST /api/launchd/statuses` に `{ "agents": ["alpha11", "beta222"] }` を送信する
**Then**: レスポンスは agent ごとの status 要素を返す
**And**: 各要素には少なくとも agent, running, pid, code, manager が含まれる

#### Scenario: Missing agent does not fail the whole batch response

**Given**: `alpha11` は存在し、`ghost999` は存在しない
**When**: `POST /api/launchd/statuses` に `{ "agents": ["alpha11", "ghost999"] }` を送信する
**Then**: API は batch 全体を 200 系で返せる
**And**: `ghost999` の要素には not found を示す error が含まれる
**And**: `alpha11` の status 要素は引き続き返される
