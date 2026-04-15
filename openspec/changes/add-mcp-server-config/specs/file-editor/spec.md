## MODIFIED Requirements

### Requirement: Validate writes and guard traversal

The system SHALL accept writes only for allowed paths, reject invalid YAML, and keep writes inside the agent home. For dedicated MCP configuration writes, the system SHALL validate the edited MCP fragment as YAML and merge it into `config.yaml` without allowing traversal outside the agent home.

#### Scenario: Invalid MCP YAML is rejected

- GIVEN agent `alpha` が存在する
- WHEN `PUT /api/agents/alpha/mcp` に不正な YAML を含む `content` を送る
- THEN 422 を返す
- AND `config.yaml` は更新されない

#### Scenario: MCP fragment must be a mapping

- GIVEN agent `alpha` が存在する
- WHEN `PUT /api/agents/alpha/mcp` に配列やスカラー値の YAML を送る
- THEN 422 を返す
- AND エラーは object/mapping を期待したことを示す

#### Scenario: Dedicated MCP write preserves unrelated config keys

- GIVEN agent `alpha` の `config.yaml` に `model` や `toolsets` などの既存設定がある
- WHEN `PUT /api/agents/alpha/mcp` で有効な MCP fragment を保存する
- THEN `config.yaml` の `mcp_servers` だけが更新される
- AND unrelated keys は保持される

#### Scenario: Empty MCP fragment removes mcp_servers

- GIVEN agent `alpha` の `config.yaml` に `mcp_servers` がある
- WHEN `PUT /api/agents/alpha/mcp` に空文字または空白のみの `content` を送る
- THEN `config.yaml` から `mcp_servers` が除去される
- AND unrelated keys は保持される
