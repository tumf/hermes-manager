## MODIFIED Requirements

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
