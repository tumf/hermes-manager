# Design: batch agent status fetch

## 1. Goals

- トップページの初期描画を status 取得完了から切り離す
- per-agent の `POST /api/launchd` status 呼び出しを 1 回の batch HTTP リクエストに集約する
- 既存の単体 lifecycle API 互換性を維持する

## 2. API design

新規 endpoint を `POST /api/launchd/statuses` とする。

### Request

```json
{
  "agents": ["alpha11", "beta222"]
}
```

- `agents`: 1件以上の agentId 配列
- zod で string array と件数上限を検証する

### Response

```json
{
  "statuses": [
    {
      "agent": "alpha11",
      "running": true,
      "pid": 123,
      "code": 0,
      "manager": "launchd"
    },
    {
      "agent": "beta222",
      "running": false,
      "pid": null,
      "code": 3,
      "manager": "launchd",
      "error": "Agent \"beta222\" not found"
    }
  ]
}
```

- 既存 `/api/launchd` 単体 status の主要値を agent 単位で返す
- agent ごとの失敗は配列要素へ局所化し、一覧全体 200 を優先する
- route 実装は `getAgent()` と `executeServiceAction({ action: 'status' })` を agent ごとに再利用する

## 3. Frontend flow

1. `fetchAgents()` はまず `/api/agents` だけで一覧データをセットする
2. 一覧反映後に `fetchAgentStatuses(agentIds)` を fire する
3. status 応答を受けたら `agentId -> running` をマージする
4. 取得失敗 agent は `running` を未確定のまま fallback 表示にする

## 4. UI state model

`AgentWithStatus` に加えて、トップページでは少なくとも次を管理する。

- `agents`: 一覧ベースデータ
- `statusLoading`: batch fetch 中かどうか
- `statusByAgentId`: agent ごとの `running` / `pid` / error

badge 表示は以下を区別する。

- action 実行中: 既存 busy 表示を優先
- status loading かつ未取得: loading 表示
- status 取得済み: Running / Stopped
- status 取得失敗: 一覧全体は維持し、Stopped 断定ではなく fallback を出せるようにする

## 5. Compatibility

- `/api/agents` は現状の軽量 payload を維持する
- `/api/launchd` は start/stop/restart/status の既存契約を維持する
- 新 batch endpoint はトップページ専用の補助 API として追加する
