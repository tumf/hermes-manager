## MODIFIED Requirements

### Requirement: Production start script runs server on the fixed port

`npm run start:prod` は、現在のファイルシステムベース構成に必要な前提ディレクトリとログ出力先を利用して Next.js サーバーを `PORT=18470` で起動しなければならない。旧アーキテクチャ由来のデータベース migration 前提を要求してはならない。

#### Scenario: Fresh runtime starts without database setup

**Given**: リポジトリを新規 clone し、必要な Node 依存関係をインストール済みである
**And**: `runtime/logs/` などの実行時ディレクトリは存在しないか空である
**When**: `.wt/setup` の後に `npm run start:prod` を実行する
**Then**: データベース migration を要求せずに Next.js サーバーが `PORT=18470` で起動する

#### Scenario: Hosting documentation matches production start behavior

**Given**: メンテナーが `hosting/README.md` と hosting spec を確認している
**When**: `start:prod` の説明を読む
**Then**: 説明は filesystem-based runtime に整合し、DB migration の記述を含まない
