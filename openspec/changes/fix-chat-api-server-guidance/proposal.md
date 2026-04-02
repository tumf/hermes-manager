---
change_type: implementation
priority: low
dependencies: []
references:
  - openspec/specs/chat/spec.md
  - src/components/chat-tab.tsx
  - src/lib/gateway-discovery.ts
  - tests/lib/gateway-discovery.test.ts
---

# Fix Chat Tab API Server Guidance to Mention Global Env

**Change Type**: implementation

## Problem / Context

Chat タブの api_server 未有効時ガイダンスは「エージェントの `.env` に `API_SERVER_ENABLED=true` を追加」とだけ案内している。

しかし実際の判定ロジック (`src/lib/gateway-discovery.ts:87-98`) は以下を**すべて**チェックしている:

1. `config.yaml` の `platforms.api_server`
2. `runtime/globals/.env` の `API_SERVER_ENABLED` / `API_SERVER_KEY`
3. `runtime/agents/{id}/.env` の `API_SERVER_ENABLED` / `API_SERVER_KEY`（global を override）

つまり global env に `API_SERVER_ENABLED=true` を設定すれば全エージェントで一括有効化できるにもかかわらず、現在の文言はその選択肢を案内していない。

## Proposed Solution

`src/components/chat-tab.tsx` のガイダンス文言を修正し、global env と agent env の両方を設定先として案内する。判定ロジック自体は変更しない（バグではなく文言の不備）。

修正後の案内:

- global env (`/globals` ページ) または agent の `.env` に `API_SERVER_ENABLED=true` を設定
- global 設定は全エージェントに適用され、agent の `.env` で個別に上書き可能
- gateway の再起動が必要

## Acceptance Criteria

1. Chat タブの api_server 未有効ガイダンスに「global env または agent env」と両方の設定先が記載されている
2. `/globals` ページへのリンクが含まれる
3. 既存の gateway-discovery 判定ロジックに変更がない
4. `npm run typecheck && npm run lint && npm run test` が通過する

## Out of Scope

- `API_SERVER_KEY` による有効化の文言追加（将来検討）
- config.yaml の api_server 自動有効化 UI
