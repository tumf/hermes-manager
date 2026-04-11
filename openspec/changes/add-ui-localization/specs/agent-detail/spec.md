## MODIFIED Requirements

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
