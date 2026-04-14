## MODIFIED Requirements

### Requirement: local service lifecycle management API

macOS の launchd service lifecycle management は、初回 install/register と既登録 service の restart/reload を区別して扱わなければならない。既に登録済みの service を再起動する経路は、不要な `launchctl bootstrap` の再実行に依存してはならない。service definition を動的生成する場合でも、そのことは既登録 running service に対する無条件の unregister/register を正当化しない。

#### Scenario: restart-does-not-require-rebootstrap-of-installed-service

**Given**: サーバーは macOS 上で動作しており、対象 agent service は既に launchd へ登録済みである
**When**: `POST /api/launchd` が restart 相当の既登録 service 再起動フローを実行する
**Then**: 実装は既登録 service を再起動するために不要な `launchctl bootstrap` の再実行を前提にしない
**And**: 既登録 service の再起動/再読込は install/register 手順とは別の操作として扱われる

#### Scenario: restart-failure-does-not-drop-previously-running-service-due-to-rebootstrap-attempt

**Given**: サーバーは macOS 上で動作しており、対象 agent service は launchd に登録済みかつ running である
**When**: `POST /api/launchd` が restart を試みる
**Then**: 実装は restart のためだけに先に service を unbootstrap しない
**And**: re-bootstrap 失敗のみを理由に、直前まで running だった service を停止したまま残す挙動を導入しない
