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
