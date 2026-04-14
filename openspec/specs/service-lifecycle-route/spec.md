## Requirements

### Requirement: service lifecycle route keeps HTTP contract while orchestration is modularized

`POST /api/launchd` は、HTTP request validation と response 正規化の契約を維持しつつ、service definition 生成、bootstrap、API server port 補完、state polling を route handler から分離できる構造で実装しなければならない。内部リファクタ後も action ごとの応答 shape と互換パスを変えてはならない。

#### Scenario: start action still bootstraps before waiting for running state

**Given**: 既存 agent `alpha` が存在し、service definition が未登録または stale である
**When**: `POST /api/launchd` に `{ "agent": "alpha", "action": "start" }` を送る
**Then**: 実装は start 前に service bootstrap を保証する
**And**: response は `stdout`, `stderr`, `code`, `running`, `pid`, `timedOut`, `manager` を従来どおり返す

#### Scenario: install-like actions keep api server port backfill behavior

**Given**: 既存 agent の `meta.json` に `apiServerPort` が未設定である
**When**: `install`, `start`, または `restart` action を実行する
**Then**: 実装は未使用 port を補完保存してから service definition を再生成する
**And**: port を解決できない場合は 500 と `Failed to resolve api server port for agent` を返す


### Requirement: service lifecycle route keeps HTTP contract while orchestration is modularized

`POST /api/launchd` は、HTTP request validation と response 正規化の契約を維持しつつ、service definition 生成、bootstrap、API server port 補完、state polling を route handler から分離できる構造で実装しなければならない。内部リファクタ後も action ごとの応答 shape と互換パスを変えてはならない。特に macOS launchd では、`restart` の orchestration が `install` / `start` と同じ re-bootstrap 前提に潰されてはならない。

#### Scenario: start action still bootstraps before waiting for running state

**Given**: 既存 agent `alpha` が存在し、service definition が未登録または stale である
**When**: `POST /api/launchd` に `{ "agent": "alpha", "action": "start" }` を送る
**Then**: 実装は start 前に service bootstrap を保証する
**And**: response は `stdout`, `stderr`, `code`, `running`, `pid`, `timedOut`, `manager` を従来どおり返す

#### Scenario: install-like actions keep api server port backfill behavior

**Given**: 既存 agent の `meta.json` に `apiServerPort` が未設定である
**When**: `install`, `start`, または `restart` action を実行する
**Then**: 実装は未使用 port を補完保存してから service definition を再生成する
**And**: port を解決できない場合は 500 と `Failed to resolve api server port for agent` を返す

#### Scenario: restart keeps dynamic service-definition generation without unsafe rebootstrap

**Given**: 既存 agent `alpha` が存在し、launchd service は既登録かつ running である
**When**: `POST /api/launchd` に `{ "agent": "alpha", "action": "restart" }` を送る
**Then**: 実装は必要な service definition generation や port backfill を維持できる
**And**: 既登録 service への launchd 反映は install/register とは別 phase として扱う
**And**: restart の正常系は HTTP contract (`stdout`, `stderr`, `code`, `running`, `pid`, `timedOut`, `manager`) を維持する