## ADDED Requirements

### Requirement: agent-metadata-storage

エージェントごとに `meta.json` ファイルでユーザ管理用メタデータ（name, description, tags）を保持する。

#### Scenario: meta.json が存在する場合

**Given**: `runtime/agents/{agentId}/meta.json` が `{"name":"Bot A","description":"テスト用","tags":["dev"]}` で存在する
**When**: `getAgent(agentId)` を呼び出す
**Then**: Agent オブジェクトの `name` が `"Bot A"`, `description` が `"テスト用"`, `tags` が `["dev"]` を返す

#### Scenario: meta.json が存在しない場合

**Given**: `runtime/agents/{agentId}/meta.json` が存在しない
**When**: `getAgent(agentId)` を呼び出す
**Then**: Agent オブジェクトの `name` が `""`, `description` が `""`, `tags` が `[]` を返す

### Requirement: agent-metadata-api

PUT API でメタデータを更新できる。

#### Scenario: メタデータの更新

**Given**: エージェント `abc1234` が存在する
**When**: `PUT /api/agents/abc1234/meta` に `{"name":"新名前","tags":["prod"]}` を送信する
**Then**: 200 が返り、`runtime/agents/abc1234/meta.json` に `name` と `tags` が保存される

#### Scenario: 存在しないエージェントへの更新

**Given**: エージェント `unknown` が存在しない
**When**: `PUT /api/agents/unknown/meta` にリクエストする
**Then**: 404 が返る

### Requirement: agent-copy-metadata

エージェント Copy 時に name を `(Copy)` 付きに変更する。

#### Scenario: name 付きエージェントの Copy

**Given**: エージェント `src1234` の meta.json に `{"name":"My Bot","tags":["prod"]}` が設定されている
**When**: `POST /api/agents/copy` で `from: "src1234"` を実行する
**Then**: 新エージェントの meta.json の `name` が `"My Bot (Copy)"`, `tags` が `["prod"]` になる

#### Scenario: name 未設定エージェントの Copy

**Given**: エージェント `src5678` に meta.json が存在しない
**When**: `POST /api/agents/copy` で `from: "src5678"` を実行する
**Then**: 新エージェントに meta.json は作成されない、または name が `""` のまま

### Requirement: agent-list-display-name

一覧 UI でエージェント名を表示する。

#### Scenario: name が設定されている場合

**Given**: エージェントの meta.json に `name: "本番Bot"` が設定されている
**When**: エージェント一覧ページを表示する
**Then**: agentId ではなく `"本番Bot"` が表示される

#### Scenario: name が未設定の場合

**Given**: エージェントに meta.json が存在しない
**When**: エージェント一覧ページを表示する
**Then**: agentId がそのまま表示される
