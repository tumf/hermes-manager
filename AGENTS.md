# Hermes Agents WebApp — 開発者ガイド

このファイルは AI コーディングエージェントおよびすべての開発者が読むべきガイドです。
実装前に **必ず熟読し、ドキュメントと実装の一貫性を維持してください。**

---

## ドキュメント一覧（熟読必須）

- `docs/requirements.md` — 要件定義（目的・ユースケース・機能要件・制約）
- `docs/design.md` — アーキテクチャ・ドメインモデル・DB設計・API設計
- `openspec/changes/` — 機能ごとの変更提案（proposal.md / tasks.md / specs/）

**ドキュメントと実装に矛盾が生じた場合は、コードを変更する前に必ずドキュメントを参照し、
矛盾があれば先にドキュメントを更新してから実装すること。**

---

## プロジェクト構成

```
hermes-agents/
├── app/                      # Next.js App Router
│   ├── api/                  # APIルート
│   │   ├── agents/           # GET/POST/DELETE + /copy
│   │   ├── launchd/          # POST {agent, action}
│   │   ├── files/            # GET/PUT (AGENTS.md/SOUL.md/config.yaml)
│   │   ├── env/              # GET/POST/DELETE + /resolved
│   │   ├── globals/          # GET/POST/DELETE
│   │   ├── skills/           # tree, links CRUD
│   │   └── logs/             # tail + SSE stream
│   ├── agents/[name]/        # エージェント詳細ページ（タブ）
│   ├── globals/              # グローバル変数管理ページ
│   ├── layout.tsx            # アプリシェル
│   └── page.tsx              # Agentsリスト
├── components/               # 共有UIコンポーネント
├── db/
│   └── schema.ts             # Drizzle スキーマ定義（変更時は必ずmigrate）
├── src/
│   └── lib/
│       └── db.ts             # DB クライアント（better-sqlite3）
├── docs/
│   ├── requirements.md       # 要件定義（変更時は必ず更新）
│   └── design.md             # 設計ドキュメント（変更時は必ず更新）
├── openspec/changes/         # Conflux change proposals
├── tests/                    # Vitest ユニット/コンポーネントテスト
├── runtime/
│   ├── agents/               # エージェント HERMES_HOME 実体
│   ├── globals/              # globals/.env 自動生成（gitignore）
│   ├── data/                 # SQLite DB（gitignore）
│   └── logs/                 # webapp ログ（gitignore）
└── .wt/setup                 # worktree ブートストラップ
```

---

## 開発ルール

### 1. ドキュメントは常に最新を保つ

- **要件/設計が変わったら、コードより先にドキュメントを更新する。**
- `docs/requirements.md` の FR/NFR と `docs/design.md` の API/DB 設計は、実装と常に一致している必要がある。
- DB スキーマ（db/schema.ts）を変更したら `docs/design.md` の「データベース設計」セクションも同時に更新する。

### 2. スキーマ変更のフロー

1. `db/schema.ts` を変更
2. `npm run db:generate` でマイグレーションファイル生成
3. `npm run db:push` または起動時マイグレーションで適用
4. `docs/design.md` の §3 を更新

### 3. API 変更のフロー

1. 対応する `openspec/changes/<id>/` の提案を確認（または新規作成）
2. `docs/design.md` §5 の API 設計を更新
3. 実装
4. テストを追加

### 4. バリデーション

- API の入力は **必ず zod で検証** する（query/body 両方）
- ファイルパス操作はすべて `resolve` + `startsWith(home)` で traversal 防止
- launchctl/hermes の呼び出しは `execFile`（引数配列）のみ。`exec` + 文字列連結は禁止

### 5. テスト

- `npm run test`（Vitest）: ユニット/コンポーネントテスト
- `npm run typecheck`: 型チェック
- `npm run lint`: ESLint（next lint）
- `npm run format:check`: Prettier 検証
- **PR/コミット前に全チェックを通過させること**

---

## ドメインモデル（概要）

| モデル    | テーブル    | キー関係                          |
| --------- | ----------- | --------------------------------- |
| Agent     | agents      | name UNIQUE、home と label を持つ |
| EnvVar    | env_vars    | scope='global' / scope=agentName  |
| SkillLink | skill_links | agent → sourcePath → targetPath   |

詳細: `docs/design.md §2〜3`

---

## 実行/デプロイ（概要）

```bash
npm install
npm run build
PORT=18470 npm run start   # ポート 18470 固定（mini 上の既存サービスとの競合なし確認済み）
```

- Caddy: hermes-agents.mini.tumf.dev → localhost:18470
- launchd: ~/Library/LaunchAgents/ai.hermes.agents-webapp.plist

詳細: `docs/design.md §6、§11`

---

## Conflux Proposal との対応

- 機能追加は `openspec/changes/<id>/` に proposal.md / tasks.md / specs/ を作成
- 既存の提案は `python3 ~/.hermes/skills/cflx-proposal/scripts/cflx.py list` で確認
- 実装後は `npm run test && npm run typecheck && npm run lint` を通過させてからコミット

---
