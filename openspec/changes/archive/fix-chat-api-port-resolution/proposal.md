---
change_type: implementation
priority: high
dependencies: []
references:
  - docs/design.md
  - openspec/specs/chat/spec.md
  - openspec/specs/launchd/spec.md
  - src/lib/gateway-discovery.ts
  - src/lib/agents.ts
  - app/api/agents/[id]/chat/route.ts
  - src/components/chat-tab.tsx
---

# Chat API のポート解決を meta.json 割当と整合させる

**Change Type**: implementation

## Premise / Context

- 既存の `add-api-server-port-management` で api_server 用ポートは `meta.json.apiServerPort` に自動採番され、launchd plist へ `API_SERVER_PORT` として注入される。
- 現在の Chat API は `agent.apiServerPort` を使って `http://127.0.0.1:<port>/v1/chat/completions` へ接続する。
- しかしポート発見ロジックは `gateway_state.json.api_server_port` と `.env.API_SERVER_PORT` を優先し、`meta.json.apiServerPort` を参照していない。
- その結果、割当済みポートと Chat が参照するポートが常に一致する保証がなく、`api_server 状態を取得できませんでした` などの誤判定や誤接続が起こりうる。

## Problem / Context

api_server の実際の割当ソースは `meta.json.apiServerPort` へ移行済みだが、WebApp の状態判定と Chat API が使うポート解決は旧来の `gateway_state.json` / `.env` 前提を残している。

このズレにより、次の問題が発生する。

- `gateway_state.json` に `api_server_port` がまだ書かれていない、または壊れている場合に正しい割当ポートへ到達できない
- `.env` に値がない場合に 8642 へフォールバックし、別 agent や未使用ポートへ誤接続しうる
- UI が `error` や `starting` を誤って表示し、実際には利用可能な api_server を使えない

## Proposed Solution

### 方針

- api_server ポートの正のソースを `meta.json.apiServerPort` と明示する
- 状態判定・Chat API が使うポート解決を、`meta.json` と launchd 注入前提に整合させる
- 旧 `.env.API_SERVER_PORT` は互換読み取りとしてのみ残し、新規フローの主経路から外す
- 不正確な `8642` 固定フォールバックを廃止し、ポートが確定できない場合は `connected` にしない

### ポート解決優先順位

1. `gateway_state.json.api_server_port` が妥当なら採用する
2. `meta.json.apiServerPort` が妥当なら採用する
3. 旧互換として `.env.API_SERVER_PORT` が妥当なら採用する
4. どれも妥当でなければ `connected` ではなく `error` または再起動待ち相当として扱う

### UI / API の期待結果

- `POST /api/agents/{id}/chat` は、割当済み agent について正しい localhost ポートへ接続する
- `api_server` が connected でもポートが確定できない場合は 503 を返し、誤ったポートへ接続しない
- Chat タブのガイダンスは `.env` 手動編集中心の説明ではなく、自動割当 + gateway 再起動前提へ更新する

## Acceptance Criteria

1. `discoverApiServerStatus()` は `gateway_state.json.api_server_port` が無い場合でも `meta.json.apiServerPort` を使って connected 判定とポート返却ができる
2. `discoverApiServerStatus()` は有効なポートを確定できない限り 8642 を暗黙採用しない
3. `getAgent()` / `listAgents()` 経由で返る `apiServerPort` は、割当済み agent について Chat API が使う実ポートと一致する
4. `POST /api/agents/{id}/chat` は `http://127.0.0.1:<resolved-port>/v1/chat/completions` に接続し、誤った固定ポートへは接続しない
5. Chat タブのメッセージは、自動採番・launchd 注入後の運用と矛盾しない文言になる
6. 回帰テストで `meta.json` fallback と `8642` 非フォールバックが検証される

## Out of Scope

- 既存 agent の `meta.json.apiServerPort` 自動マイグレーション
- api_server ポート範囲の変更
- hermes gateway 本体の `gateway_state.json` 出力仕様変更
