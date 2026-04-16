---
change_type: implementation
priority: medium
dependencies: []
references:
  - app/page.tsx
  - app/api/launchd/route.ts
  - src/lib/service-lifecycle.ts
  - src/components/agents-list-content.tsx
  - docs/requirements.md
  - docs/design.md
  - openspec/specs/launchd/spec.md
  - openspec/specs/agents-ui/spec.md
---

# Batch agent status fetch for top page

**Change Type**: implementation

## Problem / Context

トップページは `/api/agents` 取得後に、各 agent ごとに `POST /api/launchd { action: "status" }` を発行して running 状態を埋めている。これにより、初回表示時に agent 数ぶんの HTTP リクエストが増え、クライアント側で一覧描画が status 収集完了まで待たされる。

直前の改善で `/api/agents` 自体は高速化されたが、status 取得は依然として N リクエスト構造のままであり、fleet が増えるほどトップページの体感応答を押し下げる。multi-agent operations を主戦場とする本製品では、一覧の初期表示を軽く保ちつつ、起動状態を後から安全に反映できる設計が必要である。

## Proposed Solution

- 既存の `POST /api/launchd` の単体 action API は互換のため維持する
- 新たに複数 agent の状態を一括取得する batch status API を追加する
- トップページは `/api/agents` の一覧描画を先に行い、status は batch API で非同期に hydrate する
- status 読み込み中は一覧の他情報を先に表示し、各 agent の badge は loading / fallback を扱えるようにする
- API / UI / docs / spec / tests をまとめて更新し、N 件個別ポーリングを再導入しにくい構造へ寄せる

## Acceptance Criteria

- `/api/agents` のレスポンス構造は変更しない
- 既存の `POST /api/launchd` のレスポンス構造は変更しない
- 新しい batch status API に 1 回のリクエストで複数 agent の running / pid / code / manager を問い合わせられる
- トップページは `/api/agents` 完了後すぐに一覧本体を描画し、status は後から反映される
- agent ごとの status 取得失敗は一覧全体の描画失敗にしない
- UI テストと API テストで batch 経路と非同期 hydrate を検証する

## Out of Scope

- SSE や long-polling によるリアルタイム監視
- `/api/agents` に running 状態を再統合すること
- service manager の起動・停止・再起動ロジックの再設計
