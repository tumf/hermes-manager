## MODIFIED Requirements

### Requirement: readme-exists

リポジトリルートに README.md が存在し、`Hermes Manager` の概要・技術スタック・セットアップ手順・開発コマンド・安全な運用前提（trusted network / intranet only）・バージョニング/リリース方針を記載しなければならない。README 群、主要ドキュメント、OpenAPI、コントリビューション文書に旧 repo 名 `hermes-agents` や旧プロダクト名 `Hermes Agents WebApp` を残してはならない。

#### Scenario: 新規開発者がリポジトリを開く

**Given**: `hermes-manager` リポジトリをクローンした
**When**: README.md を開く
**Then**: プロジェクト名は `Hermes Manager` として表示される
**And**: セットアップ手順（`.wt/setup` または `npm install` → `npm run build` → `PORT=18470 npm run start`）と開発コマンド一覧が記載されている
**And**: trusted network / intranet 運用前提とバージョン/リリース方針が案内されている
**And**: 旧名称 `Hermes Agents WebApp` や旧 repo 名 `hermes-agents` は contributor-facing 説明に残らない

### Requirement: contributing-exists

リポジトリルートに CONTRIBUTING.md が存在し、`Hermes Manager` / `hermes-manager` を正準名称として貢献手順・コーディング規約への参照・品質ゲート・PR 前チェックリストを記載しなければならない。

#### Scenario: コントリビューターが変更を提出する

**Given**: `hermes-manager` に変更を加えたい
**When**: CONTRIBUTING.md を開く
**Then**: 開発環境セットアップ手順、AGENTS.md への参照、`.wt/setup` の案内、pre-commit/pre-push/CI の役割分担、PR 前に実行すべきコマンドが記載されている
**And**: 文中のリポジトリ名やプロダクト名は `Hermes Manager` / `hermes-manager` に統一されている

### Requirement: baseline-oss-files-exist

公開リポジトリとしての基礎文書 (`README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `SUPPORT.md`, OpenAPI description を含む) は、`Hermes Manager` の名称と運用前提に整合しなければならない。

#### Scenario: 公開文書が rename 後の名称に揃っている

**Given**: メンテナーが `hermes-manager` を公開リポジトリとしてレビューしている
**When**: 主要 OSS 文書と OpenAPI 文書を確認する
**Then**: `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `SUPPORT.md`, `openapi.yaml` は `Hermes Manager` を正準名称として扱う
**And**: 旧名称 `Hermes Agents WebApp` や旧 repo 名 `hermes-agents` は残らない
