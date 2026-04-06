## ADDED Requirements

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
