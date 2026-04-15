## MODIFIED Requirements

### Requirement: プロジェクト文書は現行アーキテクチャと整合しなければならない

要件定義および設計文書は、実装済みの正準アーキテクチャと矛盾しない内容を維持しなければならない。エージェント運用ワークフローとして MCP 設定をサポートする場合、その編集面と API は `config.yaml` を source of truth とする設計として文書化されなければならない。

#### Scenario: Requirements and design mention MCP configuration workflow

**Given** Hermes Manager が agent detail で MCP 設定を提供する
**When** 開発者が `docs/requirements.md` と `docs/design.md` を確認する
**Then** `mcp_servers` を管理する dedicated workflow と関連 API が記載されている
**And** `config.yaml` が canonical storage であることが明記されている
