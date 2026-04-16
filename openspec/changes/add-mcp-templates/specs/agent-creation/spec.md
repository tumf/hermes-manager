## MODIFIED Requirements

### Requirement: New agent uses resolved SOUL template as source content

新規 agent 作成時、システムは SOUL だけでなく `config.yaml` テンプレートもそのまま初期設定として適用できなければならない。これにより MCP サーバ設定を含む agent-specific config scaffolding を作成時に再利用できる。

#### Scenario: New agent can start with separately selected MCP template

**Given** `config.yaml` テンプレートとは別に MCP template `github-default` が存在する
**When** ユーザーがその MCP template を指定して agent を作成する
**Then** 作成された agent の `config.yaml` には template 由来の `mcp_servers` が含まれる
**And** SOUL / memory の初期化フローには影響しない

#### Scenario: New agent creation stays backward compatible without MCP template

**Given** ユーザーが MCP template を指定せずに agent を作成する
**When** agent が作成される
**Then** 新しい agent の SOUL / memory / config scaffolding は既存の file template 解決ルールどおりに行われる
**And** MCP template 不在だけを理由に作成は失敗しない
