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

### Requirement: contributing-exists

The repository root MUST describe developer workflows, including how different classes of tests are executed and maintained.

#### Scenario: Contributor reviews test commands before submitting changes

**Given** a contributor reads the repository documentation before changing tests
**When** they look for verification commands and test organization guidance
**Then** the documentation explains the intended boundary between Vitest and Playwright suites
**And** it identifies the command used for each suite
