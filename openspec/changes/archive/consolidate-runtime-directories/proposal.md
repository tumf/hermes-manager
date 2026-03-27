# Consolidate Runtime-Generated Directories

## Problem/Context

現在のリポジトリでは、実行時に生成・更新されるデータが `agents/`・`globals/`・`data/`・`logs/` に分散しており、ソースコードと運用データの境界が曖昧です。これにより、バックアップ、移行、環境再構築、運用時トラブルシュートのコストが増加しています。

## Proposed Solution

生成先を `runtime/` 配下に統合し、運用データの配置を一元化します。

- `agents/` → `runtime/agents/`
- `globals/` → `runtime/globals/`
- `data/` → `runtime/data/`
- `logs/`（webapp）→ `runtime/logs/`

加えて、以下を実施します。

1. パス解決ロジックを `runtime/` 基準に統一
2. 既存環境向けに安全な移行手順（ディレクトリ移動・DB `agents.home` 更新・launchd再生成）を提供
3. docs/openspec を新構成へ更新

## Acceptance Criteria

1. アプリ起動後、DB は `runtime/data/app.db` を使用する。
2. Agent 作成/コピー/削除で `runtime/agents/<name>/` が正しく更新される。
3. Globals 更新で `runtime/globals/.env` が再生成される。
4. launchd の Agent 起動で `runtime` 配下のパスが使われる。
5. 既存インストールの移行手順で、既存 Agent の `home` が破綻せず継続稼働できる。
6. 関連 docs/spec が新パス構成と一致する。

## Out of Scope

- `runtime/` を別ディスク/NASへ配置する拡張
- 本提案外の機能追加（認証、UI刷新など）
