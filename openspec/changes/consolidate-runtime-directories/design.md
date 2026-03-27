# Design: Consolidate Runtime Directories

## Overview

本変更は、実行時に生成される永続データを `runtime/` 配下へ集約し、コード/設定/運用データの責務分離を明確化する。

## Target Layout

```text
runtime/
├── agents/
├── globals/
├── data/
└── logs/
```

## Design Decisions

### 1) Runtime Root の単一化

- すべての生成物ルートを `runtime/` 配下に統一する。
- 既存の散在配置（`agents/`, `globals/`, `data/`, `logs/`）は移行対象とする。

### 2) Path Resolution の共通化

- 文字列連結で個別に `process.cwd()` する実装を避け、共通ユーティリティで解決する。
- これにより、将来的な runtime ルート設定化（環境変数化）に備える。

### 3) Migration First（既存環境互換）

- 既存利用者向けに移行処理を提供する。
- 移行対象:
  - ディレクトリ移動
  - `agents.home` の更新
  - launchd plist 再生成（必要時）
- 再実行安全性（idempotent）を確保する。

### 4) launchd Integration

- Agent 起動時に利用する env/log/path は `runtime` 配下を参照する。
- 旧パスが残っていても、明示的移行後に新パスへ収束する。

## Risks and Mitigations

- **Risk**: 既存 DB の `home` と実ディレクトリの不整合
  - **Mitigation**: 移行時に DB 更新と FS 移動を同一フローで実施し、差分検証を行う。
- **Risk**: launchd が旧 plist を参照
  - **Mitigation**: start/install 時の再生成ロジックと移行後の再install手順を明文化する。
- **Risk**: docs と実装の乖離
  - **Mitigation**: requirements/design/spec を同一 change で更新する。

## Validation Strategy

- 単体: path utility / migration helper のテスト
- 統合: API 経由で Agent 作成→start→status、Globals 更新→`.env` 再生成
- 手動: 既存環境データを持つワークスペースで移行手順を実施し、起動継続を確認
