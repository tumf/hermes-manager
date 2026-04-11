---
change_type: implementation
priority: medium
dependencies: []
references:
  - src/lib/agents.ts
  - app/api/agents/route.ts
  - app/api/agents/[name]/route.ts
  - app/api/launchd/route.ts
  - tests/lib/agents.test.ts
  - tests/lib/api-server-port.test.ts
  - openspec/specs/data-layer/spec.md
---

# Refactor agent runtime helpers

**Change Type**: implementation

## Problem / Context

- `src/lib/agents.ts` に agent metadata 読み書き、`config.yaml` 解析、API server port 採番、process 情報解決、Agent DTO 組み立てが集中しており、単一ファイルの責務が肥大化している。
- `listAgents()` と `getAgent()` で Agent DTO の組み立てロジックが実質重複しており、port 解決や process 情報の扱いを変更すると複数箇所の同期が必要になる。
- `allocateApiServerPort()` は metadata / legacy `.env` の両方を読む重要なロジックだが、他の filesystem helper と密結合しており、将来の検証や再利用が難しい。

## Evidence

- `src/lib/agents.ts:288` と `src/lib/agents.ts:339` で Agent DTO の組み立て手順が重複している。
- `src/lib/agents.ts:229` に port 採番ロジック、`src/lib/agents.ts:165` に metadata 読み取り、`src/lib/agents.ts:124` に process 情報解決が同居している。
- `src/lib/agents.ts:389` の `createAgent()` でも metadata 正規化と discovery 組み立てを再度行っている。

## Proposed Solution

- `src/lib/agents.ts` の責務を、agent metadata/filesystem helper、API server port 採番 helper、Agent view model 組み立て helper に分離する。
- `listAgents()` / `getAgent()` / `createAgent()` が共有の組み立て関数を使う設計に揃え、port 解決・discovery・process 情報の扱いを一箇所で定義する。
- characterization test を先に追加し、既存 API 形状・filesystem 契約・legacy `.env` fallback を維持したまま内部構造だけを整理する。

## Acceptance Criteria

- `listAgents()` / `getAgent()` / `createAgent()` / `updateAgentMeta()` の外部振る舞いは変わらず、既存 API レスポンス互換が維持される。
- API server port 採番は `meta.json` と legacy `.env` の両方を考慮する現行仕様を保持する。
- characterization test により Agent DTO 組み立て、metadata 永続化、port 採番の主要ケースが回帰防止される。
- `npm run test`、`npm run typecheck`、`npm run lint` が通過する。

## Out of Scope

- Agent API の仕様変更
- runtime ディレクトリ構造や `meta.json` フォーマットの変更
- process 情報取得方式そのものの変更
