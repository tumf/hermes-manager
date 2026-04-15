## Requirements

### Requirement: readme-exists

リポジトリルートに README.md が存在し、プロジェクトの概要・技術スタック・セットアップ手順・開発コマンドを記載する。

#### Scenario: 新規開発者がリポジトリを開く

**Given**: hermes-agents リポジトリをクローンした
**When**: README.md を開く
**Then**: プロジェクト概要、セットアップ手順（npm install → npm run build → PORT=18470 npm run start）、開発コマンド一覧（dev, test, lint, typecheck, format:check）が記載されている

### Requirement: contributing-exists

リポジトリルートに CONTRIBUTING.md が存在し、貢献手順・コーディング規約への参照・PR 前チェックリストを記載する。

#### Scenario: コントリビューターが変更を提出する

**Given**: hermes-agents に変更を加えたい
**When**: CONTRIBUTING.md を開く
**Then**: 開発環境セットアップ手順、AGENTS.md への参照、PR 前に実行すべきコマンド（npm run test, npm run typecheck, npm run lint, npm run format:check）、Conflux proposal の簡易フローが記載されている

## Requirements

### Requirement: Test suites have explicit execution boundaries

The repository MUST distinguish Vitest-driven tests from Playwright-driven browser tests so contributors can determine the expected runtime model and command for each test suite.

#### Scenario: Contributor identifies the correct runner for a test

**Given** a contributor is adding or reviewing a test in the repository
**When** they inspect the repository test layout and documentation
**Then** they can tell whether the test belongs to the Vitest suite or the Playwright suite without relying on tribal knowledge

#### Scenario: Default Vitest run excludes browser-only E2E tests by design

**Given** the repository contains a browser test that requires a pre-running application server
**When** a contributor runs the default Vitest command
**Then** that browser test is not implied to be part of the Vitest suite
**And** the repository documents the separate execution path for that browser test

### Requirement: UI tests use shared helpers for repeated endpoint fixtures

The repository UI test suite MUST prefer shared test-only helpers when multiple test files exercise the same UI feature with substantially identical mock endpoint setup.

#### Scenario: Chat UI tests cover different behaviors on the same endpoint family

**Given** multiple UI tests exercise the same ChatTab feature area
**And** they require the same core mocked endpoints for agent metadata, sessions, and messages
**When** the tests are maintained over time
**Then** the common endpoint routing and render setup is defined in shared test helpers rather than reimplemented inline in each file
**And** each test file only overrides the behavior that is specific to its scenario

#### Scenario: Env tab tests vary only row state or mutation outcome

**Given** multiple UI tests exercise the same Env tab component with similar mocked API routes
**When** those tests are organized in the repository
**Then** they share common fixture builders for endpoint setup and default env rows
**And** the tests keep assertions focused on the user-visible behavior under variation

### Requirement: contributing-exists

The repository root MUST describe developer workflows, including how different classes of tests are executed and maintained.

#### Scenario: Contributor reviews test commands before submitting changes

**Given** a contributor reads the repository documentation before changing tests
**When** they look for verification commands and test organization guidance
**Then** the documentation explains the intended boundary between Vitest and Playwright suites
**And** it identifies the command used for each suite

#### Scenario: Contributor adds a UI test with repeated fetch stubs

**Given** a contributor is adding a new UI test for an existing feature area
**When** they review repository testing conventions
**Then** the project guidance steers them toward shared test-only helpers for repeated fetch routing and setup rather than copying large inline fixture blocks

### Requirement: Test fixtures are isolated from shared machine state

Repository tests MUST avoid shared temporary paths and ambient machine-specific environment assumptions when equivalent isolated fixtures can be provided inside the test.

#### Scenario: Filesystem-backed test needs scratch space

**Given** a test writes temporary files or directories during execution
**When** the test creates its scratch workspace
**Then** it uses a unique test-local temporary directory rather than a fixed shared path
**And** cleanup of one test does not interfere with another test run

#### Scenario: Test depends on an environment-derived root path

**Given** a test exercises code that derives behavior from environment variables such as the current HOME directory
**When** the test establishes its fixture preconditions
**Then** it explicitly sets or stubs the required environment-derived root for that test
**And** the result does not depend on the machine user's ambient shell configuration

### Requirement: Browser tests prefer deterministic waits

Retained browser-driven tests MUST prefer waiting on observable application state over arbitrary time-based sleeps when a deterministic condition is available.

#### Scenario: Browser test waits for skills UI to become ready

**Given** a browser test opens a page whose content loads asynchronously
**When** the test waits for the page to become ready
**Then** it waits on a specific DOM or UI condition that reflects readiness
**And** it does not rely on a raw fixed sleep if an observable readiness signal exists

## Requirements

### Requirement: プロジェクト文書は現行アーキテクチャと整合しなければならない

要件定義および設計文書は、実装済みの正準アーキテクチャと矛盾しない内容を維持しなければならない。ファイルシステムベースを唯一のソース・オブ・トゥルースとする設計へ移行済みの場合、運用要件やバックアップ・移行手順にも SQLite 前提を残してはならない。

#### Scenario: Requirements document reflects filesystem-based runtime design

**Given** 設計文書と実装がファイルシステムベースを前提としている
**When** 要件定義の運用要件を参照する
**Then** `app.db` や `better-sqlite3` のような旧ストレージ前提は記載されていない
**And** runtime ディレクトリ運用と整合する内容になっている

### Requirement: readme-exists

リポジトリルートに README.md が存在し、プロジェクトの概要・技術スタック・セットアップ手順・開発コマンド・安全な運用前提（trusted network / intranet only）・バージョニング/リリース方針を記載する。

#### Scenario: 新規開発者がリポジトリを開く

**Given**: hermes-agents リポジトリをクローンした
**When**: README.md を開く
**Then**: プロジェクト概要、セットアップ手順（`.wt/setup` または `npm install` → `npm run build` → `PORT=18470 npm run start`）、開発コマンド一覧（dev, test, lint, typecheck, format:check）が記載されている
**And**: この WebApp が trusted network / intranet 運用を前提とし、外部公開向けの認証付き SaaS ではないことが明記されている
**And**: バージョンとリリースノートの扱いが案内されている

### Requirement: contributing-exists

リポジトリルートに CONTRIBUTING.md が存在し、貢献手順・コーディング規約への参照・高速/低速の品質ゲート・PR 前チェックリストを記載する。

#### Scenario: コントリビューターが変更を提出する

**Given**: hermes-agents に変更を加えたい
**When**: CONTRIBUTING.md を開く
**Then**: 開発環境セットアップ手順、AGENTS.md への参照、`.wt/setup` の案内、pre-commit/pre-push/CI の役割分担、PR 前に実行すべきコマンド（npm run test, npm run typecheck, npm run lint）が記載されている

### Requirement: baseline-oss-files-exist

リポジトリルートには公開リポジトリとして最低限必要な OSS 文書（`LICENSE`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `SUPPORT.md`）が存在しなければならない。

#### Scenario: 公開前チェックで必須文書を確認する

**Given**: メンテナーが hermes-agents を公開リポジトリとしてレビューしている
**When**: リポジトリルートを確認する
**Then**: `LICENSE`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `SUPPORT.md` が存在する
**And**: `SECURITY.md` は脆弱性報告を公開 issue ではなく非公開経路へ誘導する
**And**: `SUPPORT.md` は利用者向けの問い合わせ先と用途を案内する

### Requirement: local-quality-gates-are-split-by-cost

ローカル品質ゲートは、コミット時の高速チェックと push/CI 時の低速チェックに分離されなければならない。

#### Scenario: コントリビューターがコミットする

**Given**: コントリビューターが変更をコミットしようとしている
**When**: pre-commit hook が実行される
**Then**: staged file に対する高速チェック（例: lint-staged / formatting）が行われる
**And**: フルの typecheck / test / build のような重い処理は pre-commit では必須にならない

#### Scenario: コントリビューターが push する

**Given**: コントリビューターがブランチを push する
**When**: pre-push hook または CI が実行される
**Then**: typecheck・test・lint を含むより重い検証が走る

### Requirement: ci-validates-supported-platforms

公開リポジトリとしての CI は、文書化されたサポート対象に合わせて複数プラットフォームで主要チェックを実行しなければならない。

#### Scenario: pull request でクロスプラットフォーム検証する

**Given**: コントリビューターが pull request を作成した
**When**: GitHub Actions の CI が走る
**Then**: 少なくとも `ubuntu-latest` と `macos-latest` のジョブが実行される
**And**: `fail-fast: false` により片方の失敗でももう片方の結果が確認できる
**And**: lint, format:check, typecheck, test, build が検証される

### Requirement: readme-exists

リポジトリルートの README 文書は、英語版 `README.md` を基点として、対応言語ごとの `README.{lang}.md` 命名規則で配置されなければならない。README 群は Conflux 風の言語切替バナーを各ファイル冒頭に備え、利用者が各言語版を相互に移動できるようにしなければならない。

#### Scenario: 利用者が README から別言語へ切り替える

**Given**: 利用者がリポジトリルートの任意の README 言語版を開いている
**When**: 冒頭の言語切替バナーを見る
**Then**: 英語、日本語、中国語簡体字、スペイン語、ポルトガル語（ブラジル）、韓国語、フランス語、ドイツ語、ロシア語、ベトナム語の README へのリンクが表示されている
**And**: 各リンク先はリポジトリ内に実在する `README.md` または `README.{lang}.md` ファイルである

#### Scenario: 日本語 README の正式ファイル名が統一されている

**Given**: リポジトリが多言語 README 命名規則を採用している
**When**: 利用者またはメンテナーが日本語 README を参照する
**Then**: 正式な日本語 README は `README.ja.md` である
**And**: README 群の内部リンクは `README_ja.md` ではなく `README.ja.md` を参照する

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

### Requirement: プロジェクト文書は現行アーキテクチャと整合しなければならない

要件定義および設計文書は、実装済みの正準アーキテクチャと矛盾しない内容を維持しなければならない。エージェント運用ワークフローとして MCP 設定をサポートする場合、その編集面と API は `config.yaml` を source of truth とする設計として文書化されなければならない。

#### Scenario: Requirements and design mention MCP configuration workflow

**Given** Hermes Manager が agent detail で MCP 設定を提供する
**When** 開発者が `docs/requirements.md` と `docs/design.md` を確認する
**Then** `mcp_servers` を管理する dedicated workflow と関連 API が記載されている
**And** `config.yaml` が canonical storage であることが明記されている
