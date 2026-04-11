---
change_type: implementation
priority: medium
dependencies: []
references:
  - README.md
  - README.ja.md
  - docs/requirements.md
  - docs/design.md
  - AGENTS.md
  - openapi.yaml
  - hosting/README.md
  - hosting/ai.hermes.agents-webapp.plist
  - openspec/specs/documentation/spec.md
  - openspec/specs/hosting/spec.md
  - openspec/specs/app-shell/spec.md
---

# Rename product and repository to Hermes Manager

**Change Type**: implementation

## Problem / Context

- 現在のリポジトリとプロダクトには `Hermes Agents WebApp` / `hermes-agents` / `ai.hermes.agents-webapp` / `hermes-agents.mini.tumf.dev` が混在しており、名称が分裂している。
- 現セッションでは、ユーザは新しい正式名称を `Hermes Manager` と指定し、旧名は残さず忘れてよいと明示した。
- 既存 docs / OpenAPI / hosting artifacts / OpenSpec には旧名が広く埋め込まれているため、rename はドキュメント・運用識別子・公開 URL を含む一貫した変更として扱う必要がある。

## Proposed Solution

- プロダクト正式名称を `Hermes Manager` に統一する。
- リポジトリ/パッケージ名を `hermes-manager` に統一する。
- service label・hosting artifact 名・公開 URL も `Hermes Manager` 系へ全面更新する。
- OpenSpec canonical specs と proposal documentation を、新名称と新しい運用識別子に整合させる。

## Acceptance Criteria

- README 群、主要 docs、OpenAPI title、開発者向けガイドで `Hermes Manager` / `hermes-manager` が正準表記になる。
- package metadata、directory examples、contributor-facing repo references で旧 repo 名 `hermes-agents` が残らない。
- hosting docs / specs / artifacts が新 service label と新 URL を案内する。
- app shell など UI 上のアプリ名表示が `Hermes Manager` に揃う。
- OpenSpec strict validation が通過する。

## Out of Scope

- rename 後の外部インフラ実作業（GitHub repo rename、DNS 切替、Caddy 実更新、launchctl 再登録）
- rename 実装そのもの
