---
change_type: implementation
priority: high
dependencies: []
references:
  - docs/requirements.md
  - docs/design.md
  - app/api/files/route.ts
  - src/lib/agents.ts
  - src/lib/runtime-paths.ts
  - src/components/agent-memory-tab.tsx
  - src/components/agent-file-editor.tsx
  - openspec/specs/file-editor/spec.md
  - openspec/specs/memory-tab/spec.md
  - openspec/specs/data-layer/spec.md
  - openspec/specs/runtime-layout/spec.md
---

# Add shared SOUL partials

**Change Type**: implementation

## Problem / Context

現在の WebApp では各 agent の `SOUL.md` を個別の単一ファイルとして編集・保存する。`runtime/templates/` は agent 作成時の雛形共有には使えるが、作成後の `SOUL.md` 本文を複数 agent 間で継続的に共有・同期する仕組みはない。

実際の `SOUL.md` には、ディレクトリ構成、秘密情報の扱い、GitHub アカウント運用、Obsidian URL 規約のような共通セクションが繰り返し書かれている。この共通部分を変更するたびに複数 agent の `SOUL.md` を手動更新する必要があり、同期漏れや運用コストが発生する。

一方で Hermes runtime は `SOUL.md` をそのまま読み込むため、include を解釈する仕組みをランタイムへ要求せず、最終的には従来どおり単一の展開済み `SOUL.md` を維持する必要がある。

## Proposed Solution

`SOUL.md` を「編集用 source」と「runtime が読む assembled file」に分離し、共有 partial ストアを追加する。

- `runtime/partials/{name}.md` に共有 partial を保存する
- agent ごとに任意の `SOUL.src.md` を導入し、`{{partial:name}}` 構文で共有 partial を参照できるようにする
- `SOUL.src.md` 保存時に `SOUL.md` を自動再生成する
- partial 更新時は `SOUL.src.md` を持つ agent をスキャンし、参照している agent の `SOUL.md` だけを再生成する
- `SOUL.src.md` を持たない既存 agent は後方互換モードとして従来どおり `SOUL.md` を直接編集できる
- Memory タブから agent ごとの partial 管理有効化、source 編集、partial 挿入、assembled 結果確認を行えるようにする
- Partials 管理用 API/UI を追加し、一覧・作成・編集・削除・利用中 agent の確認を可能にする

今回のスコープは `SOUL.md` のみとし、将来 `config.yaml` へ同様の仕組みを適用しやすい内部設計に留める。

## Acceptance Criteria

- `runtime/partials/{name}.md` に共有 partial を保存できる
- `SOUL.src.md` を持つ agent は `{{partial:name}}` を含む source を保存でき、保存時に `SOUL.md` が自動再生成される
- partial を更新すると、その partial を参照する agent の `SOUL.md` だけが自動再生成される
- `SOUL.src.md` を持たない既存 agent は従来どおり `SOUL.md` を直接編集できる
- partial 未存在や不正参照を含む `SOUL.src.md` 保存は 422 で失敗し、展開済み `SOUL.md` は更新されない
- 利用中 partial の削除は 409 で拒否される
- Memory タブから partial 管理の有効化、partial 挿入、assembled 結果確認ができる
- Hermes runtime は従来どおり展開済み `SOUL.md` だけを読むため、既存 runtime 互換性を維持する

## Out of Scope

- `memories/MEMORY.md` / `memories/USER.md` への partial 適用
- テンプレート機能への partial 展開の統合
- nested partial や循環参照の解決
- `config.yaml` への partial 適用実装
