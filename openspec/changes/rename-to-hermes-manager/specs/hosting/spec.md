## MODIFIED Requirements

### Requirement: Caddy snippet routes public subdomain

プロジェクトは、`hermes-manager.mini.tumf.dev` を localhost:18470 に HTTPS termination 付きで reverse proxy する Caddy 設定スニペットと運用文書を提供しなければならない。旧 URL `hermes-agents.mini.tumf.dev` を正準公開 URL として案内してはならない。

#### Scenario: Public domain resolves to renamed webapp endpoint

**Given**: snippet が active Caddyfile に含まれ、Caddy が reload 済みである
**When**: `https://hermes-manager.mini.tumf.dev` に HTTPS リクエストする
**Then**: Caddy は localhost:18470 に reverse proxy する

### Requirement: persistent local service hosting keeps webapp running

プロジェクトは、`Hermes Manager` を永続起動する local-service hosting artifacts を提供しなければならない。macOS と Linux の運用文書・artifact 名・service label は rename 後の名称に整合し、旧識別子 `ai.hermes.agents-webapp` を正準として案内してはならない。

#### Scenario: Hosting artifacts use renamed service identity

**Given**: オペレーターが macOS または Linux 向け hosting artifact と手順を参照している
**When**: launchd plist / systemd unit 名、service label、install commands を確認する
**Then**: artifact 名と service identity は `Hermes Manager` / `hermes-manager` に整合した名称を使う
**And**: 旧 service label `ai.hermes.agents-webapp` は正準手順に残らない
