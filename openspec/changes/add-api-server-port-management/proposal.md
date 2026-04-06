---
change_type: implementation
priority: high
dependencies: []
references:
  - docs/design.md
  - openspec/specs/chat/spec.md
  - openspec/specs/launchd/spec.md
  - src/lib/gateway-discovery.ts
---

# api_server ポート管理と launchd 注入

**Change Type**: implementation

## Problem / Context

Chat 機能は各エージェントの api_server（OpenAI 互換 HTTP）を前提とするが、
現状は api_server の有効化やポート割当が手動（config.yaml や .env に記述）。

- ポートが競合するリスクがある
- ユーザが config.yaml や .env を手動編集する必要がある
- 設定漏れで Chat タブが使えないケースが発生する

## Proposed Solution

### 方針

- **config.yaml / .env には一切書かない**
- ポートは `meta.json` の `apiServerPort` をマスターとする
- launchd plist 生成時に `API_SERVER_ENABLED=true` と `API_SERVER_PORT` を EnvironmentVariables に注入する

### meta.json 拡張

```json
{
  "name": "Bot A",
  "description": "",
  "tags": [],
  "apiServerPort": 8645
}
```

### ポート自動採番

- 範囲: 8642〜8699
- 採番ロジック:
  1. `runtime/agents/*/meta.json` を走査して使用中ポートを収集
  2. 範囲内で最小の未使用ポートを選択
  3. `meta.json` に `apiServerPort` として保存
- タイミング: エージェント作成時（`POST /api/agents`）

### launchd plist 注入

現在の plist EnvironmentVariables:

```xml
<key>EnvironmentVariables</key>
<dict>
  <key>HERMES_HOME</key>
  <string>{home}</string>
</dict>
```

変更後:

```xml
<key>EnvironmentVariables</key>
<dict>
  <key>HERMES_HOME</key>
  <string>{home}</string>
  <key>API_SERVER_ENABLED</key>
  <string>true</string>
  <key>API_SERVER_PORT</key>
  <string>{apiServerPort}</string>
</dict>
```

### gateway-discovery.ts への影響

既存の `discoverApiServerPort()` は gateway_state.json → .env の順で解決する。
api_server ポートは launchd 経由で環境変数として渡されるため、hermes gateway が
起動後 `gateway_state.json` に `api_server_port` を書き込む。
既存の解決ロジックはそのまま動作する。

### 既存エージェントへの対応

- 既に `API_SERVER_PORT` を .env に持つエージェント → そのポートを `meta.json` に移行するマイグレーションは任意（手動可）
- 新規エージェントはすべて自動採番

## Acceptance Criteria

1. `POST /api/agents` でエージェント作成時に `apiServerPort` が `meta.json` に自動設定される
2. ポートは既存エージェントと競合しない
3. launchd install 時の plist に `API_SERVER_ENABLED=true` と `API_SERVER_PORT` が含まれる
4. gateway 起動後、`discoverApiServerPort()` で正しいポートが返される
5. ポート範囲 8642〜8699 が枯渇した場合はエラーを返す

## Out of Scope

- 既存エージェントの自動マイグレーション（手動で meta.json 編集可能）
- ポート範囲のカスタマイズ
- .env / config.yaml からの api_server 設定の自動削除
