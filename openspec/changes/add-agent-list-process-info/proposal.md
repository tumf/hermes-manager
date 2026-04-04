---
change_type: implementation
priority: medium
dependencies: []
references:
  - docs/requirements.md
  - docs/design.md
  - app/api/agents/route.ts
  - src/lib/agents.ts
  - src/components/agents-list-content.tsx
  - src/components/agent-card.tsx
  - app/api/launchd/route.ts
---

# Add agent list process info

**Change Type**: implementation

## Problem / Context

Agents 一覧では各 agent の表示名・label・tags・起動状態のみを表示している。常駐運用では、どの agent がどれだけメモリを消費しているか、また現在どの Hermes バージョンで動作しているかを一覧で確認したい。

現状の `GET /api/agents` は process-level 情報を返さず、UI も追加の列を持たない。そのため、運用者は個別に launchd 状態や CLI バージョンを調べる必要がある。

## Proposed Solution

Agents 一覧向けデータ取得に、各 agent のプロセス情報を追加する。

- `GET /api/agents` に以下の読み取り専用フィールドを追加する
  - 稼働中 `hermes gateway` プロセスの RSS ベースのメモリ使用量
  - agent が使用する Hermes CLI のバージョン文字列
- 一覧テーブルとモバイルカードに Memory / Hermes 表示を追加する
- 取得失敗時や停止中は `--` を表示し、一覧全体は継続表示する
- Hermes バージョンは agent ごとに取得可能な値を返すが、実際に共通バイナリで同一値になるケースも許容する

## Acceptance Criteria

- Agents 一覧デスクトップ表示に Memory 列と Hermes 列が追加される
- Agents 一覧モバイルカードでもメモリ量と Hermes バージョンが確認できる
- 稼働中 agent は RSS ベースのメモリ量を表示する
- 停止中または取得失敗時は `--` を表示する
- `GET /api/agents` レスポンスに process info が含まれる
- 既存の起動/停止/再起動操作や一覧表示は壊れない

## Out of Scope

- CPU 使用率表示
- メモリ履歴グラフや時系列保存
- Hermes バージョンの固定/更新機能
