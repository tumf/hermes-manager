## MODIFIED Requirements

### Requirement: Agent detail tabs focus on canonical managed-agent workflows

The agent detail UI SHALL expose Metadata, Memory, Config, Env, Skills, Delegation, Cron, Chat, and Logs tabs. MCP server configuration SHALL be handled inside the Config tab’s `config.yaml` editor rather than through a separate MCP tab.

#### Scenario: Agent detail does not show a separate MCP tab

- GIVEN operator が agent detail page を開く
- WHEN tabs が描画される
- THEN `MCP` タブは表示されない
- AND `Config` タブは表示される
- AND operator は `config.yaml` を編集して MCP server configuration を管理できる
