---
change_type: implementation
priority: high
dependencies: []
references:
  - hosting/ai.hermes.manager.plist
  - hosting/README.md
  - src/lib/launchd.ts
  - src/lib/service-lifecycle.ts
  - src/lib/launchd-adapter.ts
  - tests/api/launchd.test.ts
  - openspec/specs/hosting/spec.md
  - openspec/specs/launchd/spec.md
---

# Fix hosting launchd bootstrap errors

**Change Type**: implementation

## Premise / Context

- 現セッションでは、macOS で再起動時に「成功しているのに `Bootstrap failed: 5: Input/output error` が出る」という運用不整合が報告された。
- リポジトリ同梱の `hosting/ai.hermes.manager.plist` は現 repo 位置 `<repo-root>` ではなく旧 repo path を `WorkingDirectory` と log path に保持している。
- `hosting/README.md` は初回 install に `launchctl bootstrap`、更新後 reload に `launchctl kickstart -kp` を案内している一方、artifact 側の古い固定パスが bootstrap 失敗の温床になりうる。
- 既存 launchd 実装では `Bootstrap failed: 5: Input/output error` は「service missing」ではない別失敗として扱われており、正常系として握りつぶす設計にはなっていない。

## Problem / Context

macOS 向け hosting artifact と launchd 運用の一部が rename 後の実体に追従しておらず、`launchctl bootstrap` / 再登録時にユーザが成功と失敗メッセージの混在を見る原因になっている。

特に次の2点が問題である。

- 同梱 plist が旧 repo パスを参照し、存在しない `WorkingDirectory` / log 出力先を launchd に渡してしまう。
- ドキュメントと service lifecycle の期待動作の境界が曖昧で、初回 bootstrap と既登録サービスの restart / reload の使い分けが proposal/spec 上で明文化されていない。

## Proposed Solution

- `hosting/ai.hermes.manager.plist` を現行 repo 名と runtime/logs 配置に整合する正準 artifact として更新する。
- hosting / launchd 系 spec に、macOS artifact は rename 後の実パス・log path と一致しなければならないことを明記する。
- hosting / launchd ドキュメントに、`bootstrap` は install/register、`kickstart -kp` は既登録サービスの restart/reload という運用境界を明文化する。
- service lifecycle の仕様に、既登録 launchd service を再 bootstrap して不要な code 5 を誘発しない期待動作を追加し、実装・テストの受け皿を整える。

## Acceptance Criteria

1. `hosting/ai.hermes.manager.plist` の `WorkingDirectory` / `StandardOutPath` / `StandardErrorPath` は現行 repo 位置と runtime/logs 配置に一致する。
2. hosting spec は macOS artifact が rename 後の repo パスと log path に整合しなければならないことを要求する。
3. launchd / hosting の proposal delta は、初回 install の `bootstrap` と既登録 service の restart/reload の `kickstart -kp` を区別して記述する。
4. service lifecycle 仕様は、既登録 service の再起動で不要な re-bootstrap に依存しない期待動作を持つ。
5. strict validation が通過する。

## Out of Scope

- 実際の launchctl 登録状態を各開発マシンで移行・修復する作業
- launchd 以外の Linux systemd 運用変更
- bootstrap error を正常扱いして握りつぶすだけの暫定対処
