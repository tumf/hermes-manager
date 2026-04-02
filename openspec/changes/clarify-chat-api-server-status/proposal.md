---
change_type: implementation
priority: medium
dependencies: []
references:
  - openspec/specs/chat/spec.md
  - src/lib/gateway-discovery.ts
  - src/lib/agents.ts
  - app/api/agents/[id]/route.ts
  - app/api/agents/[id]/chat/route.ts
  - src/components/chat-tab.tsx
  - tests/lib/gateway-discovery.test.ts
  - tests/api/chat.test.ts
  - tests/ui/agent-detail-page.test.tsx
---

# Clarify Chat API Server Availability Status

**Change Type**: implementation

## Problem / Context

現在の Chat タブは `apiServerAvailable: boolean` だけで api_server 利用可否を表現している。

しかし実装上、Chat が使えるためには複数の段階がある:

1. `config.yaml` または global / agent `.env` で api_server が有効化されている
2. gateway がその設定を反映して起動している
3. `gateway_state.json` 上で `gateway_state === running` になっている
4. `platforms.api_server.state === connected` になっている
5. api_server のポートが特定できる

現状はこれらをすべて `apiServerAvailable=false` に潰しているため、ユーザーからは「global env を見ていない」「設定したのに使えない」と見える。

実際には `src/lib/gateway-discovery.ts` は global env を参照しているが、UI と API が失敗理由を区別して返していないことが問題である。

## Proposed Solution

api_server の判定結果を boolean ではなく詳細状態として扱う。

### 追加する状態例

- `disabled`: config / global env / agent env のいずれでも api_server が有効化されていない
- `configured-needs-restart`: env/config 上は有効だが gateway_state が未反映、または gateway 未起動
- `starting`: gateway は running だが `platforms.api_server.state !== connected`
- `connected`: Chat 利用可能（port あり）
- `error`: 想定外の状態や壊れた state を検出

### 適用方針

- `src/lib/gateway-discovery.ts` に詳細状態を返す関数を追加する
- `src/lib/agents.ts` / `GET /api/agents/[id]` は `apiServerStatus` を返す
- 既存の `apiServerAvailable` は互換のため残してもよいが、`apiServerStatus === connected` から導出する
- `POST /api/agents/[id]/chat` の 503 エラーも詳細理由を含める
- `src/components/chat-tab.tsx` は状態ごとに異なるガイダンスを表示する

### Chat タブの表示方針

- `disabled`: global env または agent `.env` に `API_SERVER_ENABLED=true` を設定する案内
- `configured-needs-restart`: 設定済みだが gateway 再起動が必要であることを案内
- `starting`: gateway は起動中だが api_server 接続待ちであることを案内
- `connected`: 現行のストリーミング Chat UI を表示
- `error`: 状態取得失敗として再読込またはログ確認を促す

## Acceptance Criteria

1. `GET /api/agents/{id}` で `apiServerStatus` が返され、`connected` / `disabled` / `configured-needs-restart` / `starting` / `error` のいずれかで表現される
2. global env に `API_SERVER_ENABLED=true` があり gateway 未再起動のとき、Chat タブは「未設定」ではなく「設定済みだが再起動が必要」と案内する
3. gateway が running だが `platforms.api_server.state !== connected` のとき、Chat タブは接続待ち状態として案内する
4. `POST /api/agents/{id}/chat` の 503 エラーに、少なくとも状態識別可能な理由が含まれる
5. `apiServerAvailable` を残す場合は `apiServerStatus === connected` と整合する
6. `npm run typecheck && npm run lint && npm run test` が通過する

## Out of Scope

- api_server を UI から自動有効化する機能
- gateway 再起動を Chat タブから直接実行する機能
- `API_SERVER_KEY` を使った有効化パターンの文言最適化
