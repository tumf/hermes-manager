## ADDED Requirements

### Requirement: agent runtime helpers separate filesystem concerns from agent view assembly

Agent runtime helper は、agent filesystem 読み書き・API server port 採番・Agent view model 組み立ての責務を分離しなければならない。内部構造を整理しても、`listAgents()` / `getAgent()` / `createAgent()` / `updateAgentMeta()` の外部振る舞い、返却 shape、runtime ディレクトリ契約は変えてはならない。

#### Scenario: agent listing keeps current derived fields after helper split

**Given**: `runtime/agents/{id}` に `config.yaml` と任意の `meta.json` が存在する
**When**: `listAgents()` または `getAgent(id)` が agent を組み立てる
**Then**: 返却値は `agentId`, `home`, `label`, `enabled`, `apiServerStatus`, `apiServerAvailable`, `apiServerPort`, process 情報を従来どおり含む
**And**: `apiServerPort` は discovery port を優先し、未解決時のみ `meta.json` fallback を使う

#### Scenario: api server port allocation keeps legacy env fallback

**Given**: 既存 agent の一部は `meta.json.apiServerPort` 未設定だが `.env` に `API_SERVER_PORT` が残っている
**When**: 新規 port を採番する
**Then**: allocator は `meta.json` と legacy `.env` の両方を使用済みポートとして扱う
**And**: 既存 agent と衝突する port を再利用しない
