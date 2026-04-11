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
