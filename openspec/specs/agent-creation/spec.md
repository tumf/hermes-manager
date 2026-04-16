### Requirement: Agent creation defaults for SOUL editing mode

新規 agent 作成時、システムは shared partial を利用可能な source-based SOUL 編集モデルをデフォルトにし、`SOUL.src.md` を編集元、`SOUL.md` を assembled runtime file として初期生成しなければならない。

#### Scenario: New agent starts in partial mode by default

**Given**: ユーザーが Add Agent ダイアログから新規 agent を作成する
**When**: `POST /api/agents` が正常に完了する
**Then**: 作成された agent home には `SOUL.src.md` が存在する
**And**: 同じ agent home には assembled 結果の `SOUL.md` も存在する
**And**: agent 詳細 API では `partialModeEnabled=true` と判定される

#### Scenario: New agent uses resolved SOUL template as source content

**Given**: ユーザーが新規 agent 作成時に SOUL テンプレートを指定する、または default/fallback テンプレートが解決される
**When**: agent が作成される
**Then**: 解決された SOUL テンプレート内容は `SOUL.src.md` の初期内容として保存される
**And**: `SOUL.md` はその `SOUL.src.md` を assemble した内容になる

#### Scenario: Existing legacy agents remain unchanged

**Given**: 既存 agent に `SOUL.src.md` が存在しない
**When**: その agent の Memory タブまたは詳細 API が表示される
**Then**: その agent は legacy mode のまま扱われる
**And**: 従来どおり `SOUL.md` の直接編集フローを継続できる

### Requirement: New agent uses resolved SOUL template as source content

新規 agent 作成時、システムは SOUL だけでなく `config.yaml` テンプレートもそのまま初期設定として適用できなければならない。これにより MCP サーバ設定を含む agent-specific config scaffolding を作成時に再利用できる。

#### Scenario: New agent can start with template-provided MCP config

**Given** `config.yaml` テンプレートに `mcp_servers` が含まれている
**When** ユーザーがそのテンプレートを指定して agent を作成する
**Then** 作成された agent の `config.yaml` にはテンプレート由来の `mcp_servers` が含まれる
**And** SOUL / memory の初期化フローには影響しない
