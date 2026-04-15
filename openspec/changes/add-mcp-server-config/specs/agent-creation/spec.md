## MODIFIED Requirements

### Requirement: New agent uses resolved SOUL template as source content

新規 agent 作成時、システムは SOUL だけでなく `config.yaml` テンプレートもそのまま初期設定として適用できなければならない。これにより MCP サーバ設定を含む agent-specific config scaffolding を作成時に再利用できる。

#### Scenario: New agent can start with template-provided MCP config

**Given** `config.yaml` テンプレートに `mcp_servers` が含まれている
**When** ユーザーがそのテンプレートを指定して agent を作成する
**Then** 作成された agent の `config.yaml` にはテンプレート由来の `mcp_servers` が含まれる
**And** SOUL / memory の初期化フローには影響しない
