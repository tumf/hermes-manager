## MODIFIED Requirements

### Requirement: persistent local service hosting keeps webapp running

プロジェクトは、`Hermes Manager` を永続起動する macOS hosting artifact と手順を、rename 後の実 repo 配置・service identity・log 出力先に整合した状態で提供しなければならない。

- macOS 向け launchd plist は、現行の正準 repo 配置を `WorkingDirectory` に使わなければならない。
- macOS 向け launchd plist の stdout / stderr 出力先は、現行 repo 配置配下の `runtime/logs/` を指さなければならない。
- macOS 向け hosting 文書は、初回 service 登録に `launchctl bootstrap` を使い、既登録 service の restart / reload に `launchctl kickstart -kp` を使う運用境界を区別して案内しなければならない。

#### Scenario: macos-hosting-artifact-uses-current-repo-paths

**Given**: オペレーターが `hosting/ai.hermes.manager.plist` を参照している
**When**: `WorkingDirectory` と `StandardOutPath` / `StandardErrorPath` を確認する
**Then**: それらは rename 後の現行 repo 配置を基準にしている
**And**: log 出力先は現行 repo 配置配下の `runtime/logs/webapp.log` と `runtime/logs/webapp.error.log` を指す

#### Scenario: macos-hosting-docs-separate-bootstrap-from-reload

**Given**: オペレーターが macOS 向け hosting 手順を読んでいる
**When**: service の install と再起動手順を確認する
**Then**: 初回登録には `launchctl bootstrap` が案内される
**And**: 既登録 service の restart / reload には `launchctl kickstart -kp` が案内される
