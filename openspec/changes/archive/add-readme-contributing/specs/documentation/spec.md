## ADDED Requirements

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
