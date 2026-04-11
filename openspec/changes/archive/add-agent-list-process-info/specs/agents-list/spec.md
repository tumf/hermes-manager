## MODIFIED Requirements

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
