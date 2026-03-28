## Requirements

### Requirement: restart-action

`/api/launchd` API が `restart` アクションをサポートする。内部で `launchctl stop` → 短い待機 → `launchctl start` を順次実行し、エージェントを再起動する。

#### Scenario: restart-running-agent

**Given**: エージェント "test-agent" が Running 状態である
**When**: `POST /api/launchd` に `{"agent": "test-agent", "action": "restart"}` を送信する
**Then**: HTTP 200 が返り、エージェントが停止後に再起動される

#### Scenario: restart-button-visible-when-running

**Given**: エージェント "test-agent" が Running 状態で Agents 一覧ページを表示している
**When**: ページが描画される
**Then**: Stop ボタンの右隣に Restart ボタン（RotateCcw アイコン付き）が表示される

#### Scenario: restart-button-hidden-when-stopped

**Given**: エージェント "test-agent" が Stopped 状態で Agents 一覧ページを表示している
**When**: ページが描画される
**Then**: Restart ボタンは表示されない（Start ボタンのみ表示）

## Requirements

### Requirement: launchd-api-actions

`/api/launchd` の `action` パラメータが `install | uninstall | start | stop | restart | status` を受け付ける（従来は `restart` なし）。

#### Scenario: valid-restart-action-accepted

**Given**: 有効なエージェント名とアクション `restart` を含むリクエスト
**When**: `POST /api/launchd` にリクエストを送信する
**Then**: zod バリデーションを通過し、restart 処理が実行される
