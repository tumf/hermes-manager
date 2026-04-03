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

The repository root MUST describe developer workflows, including maintainable testing practices for repeated fixture setup.

#### Scenario: Contributor adds a UI test with repeated fetch stubs

**Given** a contributor is adding a new UI test for an existing feature area
**When** they review repository testing conventions
**Then** the project guidance steers them toward shared test-only helpers for repeated fetch routing and setup rather than copying large inline fixture blocks
