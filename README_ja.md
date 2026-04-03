# Hermes Agents WebApp

Hermes Agents WebApp は、mini 環境で運用する Hermes Agent 群を Web UI から一元管理するための Next.js アプリケーションです。
エージェントの作成・複製・削除、起動/停止、設定ファイル編集、環境変数管理、スキルリンク管理、ログ確認までを統合します。

詳細な運用ルール・設計方針は以下を参照してください。

- 開発者ガイド: [`AGENTS.md`](./AGENTS.md)
- 要件定義: [`docs/requirements.md`](./docs/requirements.md)
- 設計: [`docs/design.md`](./docs/design.md)

## 技術スタック

- Next.js (App Router)
- React / TypeScript
- Tailwind CSS + shadcn/ui
- Zod（API 入力バリデーション）
- ファイルシステムベースのデータ層（`runtime/` が source-of-truth）

## セットアップ

前提:

- Node.js 20+
- npm

インストール:

```bash
npm install
```

ビルド:

```bash
npm run build
```

本番起動（ポート 18470）:

```bash
PORT=18470 npm run start
```

## 開発コマンド

```bash
npm run dev
npm run test
npm run test:e2e
npm run typecheck
npm run lint
npm run format:check
npm run build
```

## テスト境界

- `npm run test` (Vitest): `tests/api`、`tests/components`、`tests/hooks`、`tests/lib`、`tests/ui` 配下のユニット/コンポーネント/統合寄りテスト。
- `npm run test:e2e` (Playwright): `tests/e2e` 配下のブラウザE2Eテスト。
- Playwrightテストは事前にアプリを起動済みであることが前提（`npm run dev` など）。

## ディレクトリ構成（概要）

```text
hermes-agents/
├── app/                    # Next.js App Router (UI / API)
├── components/             # 共有 UI コンポーネント
├── src/lib/                # ファイルシステム/Env/SkillLink ヘルパー
├── docs/                   # 要件・設計ドキュメント
├── openspec/changes/       # Conflux 変更提案
├── tests/
│   ├── api|components|hooks|lib|ui/  # Vitest ユニット/コンポーネント/統合寄りテスト
│   └── e2e/                         # Playwright ブラウザE2Eテスト（事前にアプリ起動が必要）
├── runtime/                # 実行時データ（agents/globals/logs）
└── AGENTS.md               # 開発者向け必読ガイド
```

## 貢献方法

貢献手順は [`CONTRIBUTING.md`](./CONTRIBUTING.md) を参照してください。
