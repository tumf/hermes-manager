## MODIFIED Requirements

### Requirement: Validate writes and guard traversal

The system SHALL accept writes only for allowed paths, reject invalid YAML, and keep writes inside the agent home. MCP server configuration SHALL be edited through `config.yaml` writes rather than a dedicated MCP fragment endpoint.

#### Scenario: Config editor persists MCP server configuration

- GIVEN agent `alpha` が存在する
- AND `config.yaml` に `mcp_servers` を含む有効な YAML を入力する
- WHEN operator が Config タブから保存する
- THEN `config.yaml` 全体が更新される
- AND `mcp_servers` を含む YAML がそのまま保持される

#### Scenario: Invalid config YAML is rejected

- GIVEN agent `alpha` が存在する
- WHEN operator が Config タブから不正な YAML を保存する
- THEN 422 を返す
- AND `config.yaml` は更新されない
