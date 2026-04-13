# Hermes Manager — 開発者ガイド

このファイルは AI コーディングエージェントおよびすべての開発者が読むべきガイドです。
実装前に **必ず熟読し、ドキュメントと実装の一貫性を維持してください。**

---

## ドキュメント一覧（熟読必須）

- `docs/requirements.md` — 要件定義（目的・ユースケース・機能要件・制約）
- `docs/design.md` — アーキテクチャ・ドメインモデル・データ層設計・API設計
- `openspec/changes/` — 機能ごとの変更提案（proposal.md / tasks.md / specs/）

**ドキュメントと実装に矛盾が生じた場合は、コードを変更する前に必ずドキュメントを参照し、
矛盾があれば先にドキュメントを更新してから実装すること。**

---

## プロジェクト構成

```
hermes-manager/
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
├── src/
│   └── lib/
│       ├── agents.ts          # ファイルシステムベースの Agent ヘルパー
│       ├── env-meta.ts        # .env.meta.json visibility ヘルパー
│       └── skill-links.ts     # シンボリックリンクベースの SkillLink ヘルパー
├── docs/
│   ├── requirements.md       # 要件定義（変更時は必ず更新）
│   └── design.md             # 設計ドキュメント（変更時は必ず更新）
├── openspec/changes/         # Conflux change proposals
├── tests/                    # Vitest ユニット/コンポーネントテスト
├── runtime/
│   ├── agents/               # エージェント HERMES_HOME 実体
│   ├── globals/              # globals/.env + .env.meta.json（gitignore）
│   └── logs/                 # webapp ログ（gitignore）
└── .wt/setup                 # worktree ブートストラップ
```

---

## CoreConcepts

この製品の判断軸は、今後の機能追加・UI改善・proposal 作成で常に優先される。
魅力的に見える実装案でも、ここに反するなら採用しない。

### 1. 本製品は Hermes 公式 dashboard の代替ではない

- Hermes 公式 dashboard は「単一の Hermes install / HERMES_HOME を深く管理する UI」として尊重する
- Hermes Manager / hermes-agents は「複数の Hermes Agent を一台のホスト上で運用する control plane」として定義する
- 公式 dashboard との feature parity 自体を目標にしない

### 2. 本製品の主戦場は multi-agent operations である

優先順位が高いのは、複数 agent を安全かつ再現可能に運用するための次の領域である。

- agent の一覧・識別・棚卸し
- agent の作成 / コピー / 削除
- agent ごとの HERMES_HOME 分離
- launchd / systemd による lifecycle 管理
- per-agent `api_server` port の採番・修復・可視化
- global env と agent env の階層管理
- skills の per-agent 配備
- templates / partials / memory assets を使った provisioning

### 3. 差別化として継続投資する領域

- Host operations
  - OS service manager（launchd/systemd）と密接に統合された運用
  - 起動・停止・再起動・状態確認・障害診断
- Agent provisioning
  - Template 選択、Save as Template、共有 partial、SOUL composability
  - 新規 agent や複製 agent を素早く一貫した状態で立ち上げること
- Agent-scoped deployment safety
  - env layering、visibility、port 管理、skill equip 状態、runtime layout の一貫性
- Fleet ergonomics
  - 複数 agent を横断して「どれが何者で、どう動いているか」を素早く把握できること

### 4. 重複領域は運用文脈に必要な範囲で持つ

以下の機能は維持してよいが、目的はあくまで managed agent の運用支援である。

- Chat / Sessions
  - 対象 agent が動作しているか確認する
  - セッションを再開して運用確認する
  - agent detail workflow の一部として扱う
- Logs
  - 障害調査、tail、runtime 診断のために扱う
- Cron
  - per-agent job の配備・確認・トラブルシュートのために扱う
- Skills
  - skill catalog の閲覧ではなく、「どの agent に何を積むか」の管理として扱う
- Env / Config
  - 単一 agent の総合設定 UI を目指すのではなく、multi-agent 運用の安全性・再現性に必要な範囲で扱う

### 5. 追いかけないもの

- 公式 dashboard との単純な feature parity
- 単一 agent 向け config editing completeness の競争
- analytics / cost dashboard を主目的にした開発
- セッション探索専用 UI としての完成度競争
- 「1体の Hermes を最も快適に触る UI」を目指すこと

### 6. 新機能の採否基準

新しい機能提案・実装・UI改善では必ず次を自問すること。

1. これは multi-agent operations を良くするか？
2. これは provisioning / lifecycle / deployment safety のどれを改善するか？
3. これは upstream dashboard ではなく Hermes Manager が持つべき理由があるか？
4. これは feature parity 欲求ではなく、明確な operator workflow に根差しているか？

十分に答えられない場合、その機能は defer するか、スコープを縮小する。

### 7. ポジショニング文

- 公式 dashboard: 「ひとつの Hermes を深く管理する UI」
- Hermes Manager: 「複数の Hermes Agent を配備・運用・再利用するための control plane」

README・proposal・設計ドキュメント・Issue・PR はこのポジショニングから逸脱しないこと。

### 8. proposal / design 時の追加ルール

公式 dashboard と重なる機能を追加・拡張する proposal を作る場合は、必ず以下を明記すること。

- なぜ multi-agent operations に必要か
- keep / adapt / defer のどれか
- upstream dashboard では満たせない operator workflow は何か
- link / reference / 部分統合では不十分な理由は何か

### 9. 明示的な非ゴール

Hermes Manager は「単一 Hermes install にとって唯一必要な dashboard」になることを目指さない。
この製品の役割は、「多数の Hermes agents を一貫して管理できる local fleet control plane」である。

---

## 開発ルール

### 1. ドキュメントは常に最新を保つ

- **要件/設計が変わったら、コードより先にドキュメントを更新する。**
- `docs/requirements.md` の FR/NFR と `docs/design.md` の API/データ層設計は、実装と常に一致している必要がある。

### 2. データ層

- データは `runtime/` ディレクトリ構造がソース・オブ・トゥルース（SQLite は使用しない）
- エージェント: `runtime/agents/{agentId}/` ディレクトリ（config.yaml 必須）
- 環境変数: `.env` ファイル + `.env.meta.json`（visibility メタデータ）
- スキルリンク: `runtime/agents/{agentId}/skills/` 配下のシンボリックリンク

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

| モデル    | ストレージ                | キー関係                                           |
| --------- | ------------------------- | -------------------------------------------------- |
| Agent     | `runtime/agents/{id}/`    | ディレクトリ名 = agentId、config.yaml 必須         |
| EnvVar    | `.env` + `.env.meta.json` | scope='global'(`runtime/globals/`) / scope=agentId |
| SkillLink | シンボリックリンク        | `{agent.home}/skills/{relativePath}` → sourcePath  |

詳細: `docs/design.md §2〜3`

---

## 実行/デプロイ（概要）

```bash
npm install
npm run build
PORT=18470 npm run start   # ポート 18470 固定（mini 上の既存サービスとの競合なし確認済み）
```

- Caddy: hermes-manager.mini.tumf.dev → localhost:18470
- launchd: ~/Library/LaunchAgents/ai.hermes.manager.plist

詳細: `docs/design.md §6、§11`

---

## Conflux Proposal との対応

- 機能追加は `openspec/changes/<id>/` に proposal.md / tasks.md / specs/ を作成
- 既存の提案は `python3 ~/.hermes/skills/cflx-proposal/scripts/cflx.py list` で確認
- 実装後は `npm run test && npm run typecheck && npm run lint` を通過させてからコミット

---
