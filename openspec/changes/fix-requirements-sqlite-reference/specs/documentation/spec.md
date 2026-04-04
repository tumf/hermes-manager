## MODIFIED Requirements

### Requirement: プロジェクト文書は現行アーキテクチャと整合しなければならない

要件定義および設計文書は、実装済みの正準アーキテクチャと矛盾しない内容を維持しなければならない。ファイルシステムベースを唯一のソース・オブ・トゥルースとする設計へ移行済みの場合、運用要件やバックアップ・移行手順にも SQLite 前提を残してはならない。

#### Scenario: Requirements document reflects filesystem-based runtime design

**Given** 設計文書と実装がファイルシステムベースを前提としている  
**When** 要件定義の運用要件を参照する  
**Then** `app.db` や `better-sqlite3` のような旧ストレージ前提は記載されていない  
**And** runtime ディレクトリ運用と整合する内容になっている
