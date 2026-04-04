---
change_type: spec-only
priority: medium
dependencies: []
references:
  - docs/requirements.md
  - docs/design.md
  - openspec/specs/data-layer/spec.md
  - openspec/specs/documentation/spec.md
---

# Fix stale SQLite reference in requirements

**Change Type**: spec-only

## Problem / Context

`docs/requirements.md` §8 運用要件には `runtime/data/app.db（better-sqlite3）` と `drizzle-kit` の記述が残っている。一方で `docs/design.md` と現行実装は、`runtime/` ディレクトリ構造を唯一のソース・オブ・トゥルースとするファイルシステムベース設計に移行済みであり、SQLite 前提は現状と矛盾する。

この不整合により、運用手順やバックアップ対象、移行理解に混乱を生む。

## Proposed Solution

要件定義の運用要件を現行設計に合わせて修正する。

- `app.db` / `better-sqlite3` / `drizzle-kit` 前提を削除する
- ファイルシステムベースの運用実態に合わせて runtime 配下の管理対象を明記する
- バックアップ・監視・移行記述を現状の構成と矛盾しない内容にそろえる

## Acceptance Criteria

- `docs/requirements.md` に SQLite 前提の記述が残らない
- `docs/requirements.md` の運用要件が `docs/design.md` のファイルシステムベース設計と整合する
- ドキュメントだけを対象とし、実装コードは変更しない

## Out of Scope

- 実装の挙動変更
- 新しいストレージ層の追加
- 運用フローの大幅な再設計
