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
