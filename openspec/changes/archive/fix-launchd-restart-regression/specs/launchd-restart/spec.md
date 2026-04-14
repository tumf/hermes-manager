## MODIFIED Requirements

### Requirement: restart-action

`/api/launchd` API が `restart` アクションをサポートする。running 状態の macOS launchd service を再起動するとき、実装は安全な restart/reload 操作を優先し、restart のためだけに既登録 service を `bootout -> bootstrap` し直す前提を持ってはならない。

#### Scenario: restart-running-agent

**Given**: エージェント `test-agent` が Running 状態であり、対応する launchd service は既登録である
**When**: `POST /api/launchd` に `{"agent": "test-agent", "action": "restart"}` を送信する
**Then**: HTTP 200 が返り、エージェントが安全に再起動される
**And**: restart のためだけに不要な re-bootstrap を前提にしない

#### Scenario: restart-running-agent-does-not-fail-with-bootstrap-code-5-regression

**Given**: エージェント `test-agent` が Running 状態であり、plist は server-side state から動的生成されうる
**When**: `POST /api/launchd` に `{"agent": "test-agent", "action": "restart"}` を送信する
**Then**: 実装は plist 動的生成の必要性と restart safety を両立する
**And**: 既登録 running service に対する restart が `Bootstrap failed: 5: Input/output error` を誘発する re-bootstrap 前提へ退行しない

### Requirement: launchd-api-actions

`/api/launchd` の `action` パラメータが `install | uninstall | start | stop | restart | status` を受け付ける（従来は `restart` なし）。

#### Scenario: valid-restart-action-accepted

**Given**: 有効なエージェント名とアクション `restart` を含むリクエスト
**When**: `POST /api/launchd` にリクエストを送信する
**Then**: zod バリデーションを通過し、restart 処理が実行される
