---
change_type: spec-only
priority: medium
dependencies: []
references:
  - docs/requirements.md
  - docs/design.md
  - AGENTS.md
---

# README.md と CONTRIBUTING.md の追加

**Change Type**: spec-only

## Problem / Context

hermes-agents リポジトリには README.md と CONTRIBUTING.md が存在しない。
新規開発者やエージェントがリポジトリに初めてアクセスした際に、プロジェクトの概要・セットアップ手順・貢献方法が分からない。

## Proposed Solution

1. **README.md** を追加する
   - プロジェクト概要（Hermes Agents WebApp の目的）
   - 技術スタック（Next.js App Router, Tailwind, shadcn/ui, ファイルシステムベースデータ層）
   - セットアップ手順（`npm install` → `npm run build` → `PORT=18470 npm run start`）
   - 開発コマンド一覧（dev, build, test, lint, typecheck, format:check）
   - ディレクトリ構成の概要
   - AGENTS.md への参照リンク

2. **CONTRIBUTING.md** を追加する
   - 開発環境のセットアップ
   - コーディング規約（AGENTS.md のルールへの参照）
   - PR/コミット前チェック（test, typecheck, lint, format:check）
   - Conflux proposal ワークフローの簡易説明
   - ドキュメント先行ルールの強調

## Acceptance Criteria

- [ ] リポジトリルートに README.md が存在し、プロジェクト概要・セットアップ・開発コマンドが記載されている
- [ ] リポジトリルートに CONTRIBUTING.md が存在し、貢献手順・チェック項目が記載されている
- [ ] 既存の AGENTS.md / docs/ との内容重複は最小限に抑え、詳細は参照リンクで誘導する

## Out of Scope

- ライセンスファイルの追加（LICENSE は別提案）
- docs/ 配下のドキュメント内容の変更
