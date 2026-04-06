# エージェント一覧ページ分割 — 仕様

### REQ-1: 分割後の機能同一性

分割後のエージェント一覧ページは、分割前と同一の表示・操作を提供すること。

### シナリオ: エージェント追加

- Given: Add Agent ダイアログを開く
- When: テンプレートを選択し、フォームを送信する
- Then: `/api/agents` に POST が送信される
- And: 成功時にダイアログが閉じ、一覧が再取得される
- And: トーストで作成完了が表示される

### シナリオ: エージェント削除

- Given: エージェントカードのドロップダウンから Delete を選択
- When: 確認ダイアログで OK を押す
- Then: `/api/agents?id=...&purge=true` に DELETE が送信される
- And: 一覧が再取得される

### Requirement: Agents 一覧は運用に必要な主要状態を一覧表示できなければならない

Agents 一覧は、各 agent について表示名、識別子、起動状態に加えて、常駐運用の判断に必要な process-level 情報を表示しなければならない。process-level 情報には、稼働中プロセスの RSS ベースのメモリ使用量と、その agent が使用する Hermes バージョンを含む。取得できない値は一覧全体の描画を失敗させず、欠損表示として扱わなければならない。

#### Scenario: Running agent shows memory and Hermes version

**Given** Agents 一覧に稼働中の agent が含まれる  
**When** 一覧データを取得して表示する  
**Then** その agent の行またはカードに RSS ベースのメモリ使用量が表示される  
**And** Hermes バージョンが表示される

#### Scenario: Stopped or undiscoverable process info shows fallback

**Given** 停止中の agent または process info の取得に失敗した agent がある  
**When** 一覧データを取得して表示する  
**Then** 一覧全体は継続表示される  
**And** Memory および Hermes の欠損値は `--` として表示される

### Requirement: Agents 一覧は運用に必要な主要状態を一覧表示できなければならない

Agents 一覧は、各 agent について表示名、識別子、起動状態に加えて、常駐運用の判断に必要な主要状態を表示しなければならない。一覧では稼働中プロセスの RSS ベースのメモリ使用量を表示し、取得できない値は一覧全体の描画を失敗させず欠損表示として扱わなければならない。Hermes バージョンは一覧では表示せず、agent 詳細ページで確認できなければならない。

#### Scenario: Running agent shows memory in agents list

**Given** Agents 一覧に稼働中の agent が含まれる  
**When** 一覧データを取得して表示する  
**Then** その agent の行またはカードに RSS ベースのメモリ使用量が表示される  
**And** Hermes バージョンは一覧には表示されない

#### Scenario: Stopped or undiscoverable process info shows fallback in list

**Given** 停止中の agent または process info の取得に失敗した agent がある  
**When** 一覧データを取得して表示する  
**Then** 一覧全体は継続表示される  
**And** Memory の欠損値は `--` として表示される  
**And** Hermes バージョンの欠損有無は一覧表示に影響しない
