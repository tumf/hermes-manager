## MODIFIED Requirements

### Requirement: local service lifecycle management API

macOS の launchd service lifecycle management は、初回 install/register と既登録 service の restart/reload を区別して扱わなければならない。既に登録済みの service を再起動する経路は、不要な `launchctl bootstrap` の再実行に依存してはならない。

#### Scenario: restart-does-not-require-rebootstrap-of-installed-service

**Given**: サーバーは macOS 上で動作しており、対象 agent service は既に launchd へ登録済みである
**When**: `POST /api/launchd` が restart 相当の既登録 service 再起動フローを実行する
**Then**: 実装は既登録 service を再起動するために不要な `launchctl bootstrap` の再実行を前提にしない
**And**: 既登録 service の再起動/再読込は install/register 手順とは別の操作として扱われる
