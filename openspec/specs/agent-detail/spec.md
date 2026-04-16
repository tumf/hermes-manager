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

### Requirement: Agent detail uses Config as the canonical runtime configuration surface

Agent detail pages SHALL expose runtime configuration through the `Config` tab’s `config.yaml` editor and SHALL NOT provide a separate MCP-only editing tab.

#### Scenario: MCP tab is not shown in agent detail

**Given** an operator opens an agent detail page
**When** the detail tabs render
**Then** an `MCP` tab is not shown alongside the management tabs
**And** a `Config` tab is shown

#### Scenario: Config tab is the MCP editing path

**Given** agent `alpha` has `mcp_servers` configured in `config.yaml`
**When** the operator opens the `Config` tab
**Then** the editor loads `config.yaml`
**And** the operator can review and edit `mcp_servers` within that file alongside other runtime config keys
**And** no separate MCP-only editor surface is presented


### Requirement: Agent detail tabs focus on canonical managed-agent workflows

The agent detail UI SHALL expose Metadata, Memory, Config, Env, Skills, Delegation, Cron, Chat, and Logs tabs. MCP server configuration SHALL be handled inside the Config tab’s `config.yaml` editor rather than through a separate MCP tab.

#### Scenario: Agent detail does not show a separate MCP tab

- GIVEN operator が agent detail page を開く
- WHEN tabs が描画される
- THEN `MCP` タブは表示されない
- AND `Config` タブは表示される
- AND operator は `config.yaml` を編集して MCP server configuration を管理できる