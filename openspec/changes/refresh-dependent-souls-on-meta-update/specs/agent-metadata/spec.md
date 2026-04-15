## MODIFIED Requirements

### Requirement: Update metadata by API

The system SHALL allow metadata updates through `PUT /api/agents/{id}/meta` without losing an existing `apiServerPort`, and SHALL refresh dependent generated delegation output for agents that reference the updated agent.

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

#### Scenario: Refresh dependent delegation SOUL output after metadata update

- GIVEN agent `research01` を `allowedAgents` に含む agent `planner01` の `delegation.json` が存在する
- AND agent `planner01` の generated `SOUL.md` は `research01` の metadata を含む subagent block を持つ
- WHEN `PUT /api/agents/research01/meta` で `name`, `description`, または `tags` を更新する
- THEN `runtime/agents/planner01/SOUL.md` は再 assemble される
- AND generated subagent block reflects the latest metadata for `research01`

#### Scenario: Update rejects unknown agent

- GIVEN agent が存在しない
- WHEN `PUT /api/agents/{id}/meta` を呼び出す
- THEN 404 を返す
