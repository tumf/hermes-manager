# エージェント詳細ページ分割 — 仕様

### REQ-1: フック抽出後の機能同一性

分割後のエージェント詳細ページは、分割前と同一の HTTP リクエストを同一タイミングで発行し、同一の UI 状態遷移を行うこと。

### シナリオ: ステータス取得

- Given: エージェント詳細ページを開く
- When: ページがマウントされる
- Then: `/api/launchd` に `{ agent, action: "status" }` が POST される
- And: レスポンスに応じて Running/Stopped バッジが表示される

### シナリオ: start/stop 操作

- Given: エージェントが Stopped 状態
- When: Start ボタンをクリック
- Then: actionBusy が "start" になり、ボタンが disabled になる
- And: `/api/launchd` に `{ agent, action: "start" }` が POST される
- And: 成功時にトーストが表示され、ステータスが再取得される

## Requirements

### Requirement: Agent 詳細ページは Hermes バージョンを表示できなければならない

Agent 詳細ページは、対象 agent の識別情報とあわせて Hermes バージョンを表示しなければならない。Hermes バージョンが取得できない場合でもページ全体の表示は継続し、欠損表示として扱わなければならない。

#### Scenario: Detail page shows Hermes version

**Given** Hermes バージョンが取得できる agent の詳細ページを開く
**When** ページのヘッダー情報エリアが表示される
**Then** Agent 名や識別子の近くで Hermes バージョンが表示される

#### Scenario: Detail page shows fallback when Hermes version is unavailable

**Given** Hermes バージョンが取得できない agent の詳細ページを開く
**When** ページのヘッダー情報エリアが表示される
**Then** Hermes バージョン欄には `--` が表示される
**And** 他のヘッダー情報とタブ UI は通常どおり表示される

### Requirement: Agent 詳細ページは Hermes バージョンを表示できなければならない

Agent 詳細ページは、対象 agent の識別情報とあわせて Hermes バージョンを表示しなければならない。Hermes バージョンが取得できない場合でもページ全体の表示は継続し、欠損表示として扱わなければならない。ページヘッダーとタブラベルは有効な UI locale に応じてローカライズされなければならない。

#### Scenario: Detail page tab labels are localized

**Given** エージェント詳細ページを locale `ru` で開く
**When** ヘッダー情報とタブ UI が表示される
**Then** Metadata / Memory / Config / Env / Skills / Cron / Chat / Logs の各ラベルはロシア語で表示される

#### Scenario: Missing translation falls back safely

**Given** エージェント詳細ページの一部ラベルについて locale `fr` の翻訳が未定義である
**When** ページを表示する
**Then** 未定義キーはデフォルト locale の文字列で表示される
**And** ページ全体の表示と操作は継続できる

## Requirements

### Requirement: Agent detail exposes a dedicated MCP configuration workflow

Agent detail pages SHALL provide a dedicated MCP configuration workflow for each managed agent, separate from the raw `config.yaml` editor, so operators can review and update `mcp_servers` safely.

#### Scenario: MCP tab is visible in agent detail

**Given** an operator opens an agent detail page
**When** the detail tabs render
**Then** an `MCP` tab is shown alongside the existing management tabs

#### Scenario: MCP tab loads only mcp_servers fragment

**Given** agent `alpha` has `mcp_servers` configured in `config.yaml`
**When** the operator opens the `MCP` tab
**Then** the editor loads only the serialized `mcp_servers` fragment
**And** it does not expose unrelated `config.yaml` sections in that editor

#### Scenario: MCP tab provides upstream docs link

**Given** the operator opens the `MCP` tab
**When** the help text is displayed
**Then** the UI includes a direct link to the Hermes MCP usage guide
**And** the link opens the upstream documentation URL
