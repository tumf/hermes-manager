# Hermes Agents WebApp

[![日本語](https://img.shields.io/badge/%E6%97%A5%E6%9C%AC%E8%AA%9E-blue?style=flat-square)](./README.ja.md) [![English](https://img.shields.io/badge/English-blue?style=flat-square)](./README.md) [![简体中文](https://img.shields.io/badge/%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-blue?style=flat-square)](./README.zh-CN.md) [![Español](https://img.shields.io/badge/Espa%C3%B1ol-blue?style=flat-square)](./README.es.md) [![Português%20(BR)](<https://img.shields.io/badge/Portugu%C3%AAs%20(BR)-blue?style=flat-square>)](./README.pt-BR.md) [![한국어](https://img.shields.io/badge/%ED%95%9C%EA%B5%AD%EC%96%B4-blue?style=flat-square)](./README.ko.md) [![Français](https://img.shields.io/badge/Fran%C3%A7ais-blue?style=flat-square)](./README.fr.md) [![Deutsch](https://img.shields.io/badge/Deutsch-blue?style=flat-square)](./README.de.md) [![Русский](https://img.shields.io/badge/%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9-blue?style=flat-square)](./README.ru.md) [![Tiếng%20Việt](https://img.shields.io/badge/Ti%E1%BA%BFng%20Vi%E1%BB%87t-blue?style=flat-square)](./README.vi.md)

![Hermes Agents WebApp スクリーンショット](./docs/images/ss-agents-1.png)

Hermes Agents WebApp は、複数の Hermes Agent を単一の Web UI から運用するための Next.js ダッシュボードです。
trusted-network / イントラネット環境で、agent ごとの `HERMES_HOME`、ローカルサービス、設定ファイル、スキル、Cron、ログ、チャット履歴をまとめて管理する用途を想定しています。

Web UI は次の 10 言語に対応しています。

- 日本語 (`ja`)
- 英語 (`en`)
- 中国語・簡体字 (`zh-CN`)
- スペイン語 (`es`)
- ポルトガル語（ブラジル） (`pt-BR`)
- ベトナム語 (`vi`)
- 韓国語 (`ko`)
- ロシア語 (`ru`)
- フランス語 (`fr`)
- ドイツ語 (`de`)

言語切替は共通 app shell の Language Switcher から行えます。選択した locale は `localStorage` に保存され、無効値や未設定時は日本語へフォールバックします。

注意: 多言語化の対象はアプリケーション UI のみです。`SOUL.md`、メモリファイル、ログ、チャット転写などの運用コンテンツは自動翻訳されません。

## ドキュメントマップ

- 開発フローとリポジトリ規約: [`AGENTS.md`](./AGENTS.md)
- 要件定義: [`docs/requirements.md`](./docs/requirements.md)
- アーキテクチャ / API 設計: [`docs/design.md`](./docs/design.md)
- 英語版 README: [`README.md`](./README.md)
- 貢献ガイド: [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- セキュリティ報告: [`SECURITY.md`](./SECURITY.md)
- 利用者向け案内: [`SUPPORT.md`](./SUPPORT.md)

## 概要

Hermes Agents WebApp では、ブラウザ UI から次の操作を行えます。

- エージェントの作成・複製・削除
- launchd（macOS）/ systemd（Linux）経由の起動・停止・再起動
- `SOUL.md`、`SOUL.src.md`、`memories/MEMORY.md`、`memories/USER.md`、`config.yaml`、`.env` の編集
- visibility メタデータ付きの global / agent 環境変数管理
- ローカルスキルカタログからのスキル equip
- ログ、Cron ジョブ、チャットセッションの確認

## 安全性 / 信頼境界

このプロジェクトは trusted-network / イントラネット運用を前提にしています。
公開インターネット向け認証、多人数向けの権限分離、外部公開のための防御はデフォルトでは含みません。
イントラネット外で運用する場合は、必ず前段に独自の認証・アクセス制御を追加してください。

## スクリーンショット

### Agents 一覧

![Hermes Agents WebApp スクリーンショット](./docs/images/ss-agents-1.png)

### メモリ管理

![Hermes Agents メモリ管理画面](./docs/images/ss-agent_memory-1.png)

## 技術スタック

- Next.js (App Router)
- React / TypeScript
- Tailwind CSS + shadcn/ui
- Zod（API 入力バリデーション）
- ファイルシステムベースのデータ層（`runtime/` が source-of-truth）

## クイックスタート

前提:

- Node.js 20+
- npm
- UI から常駐サービスを操作したい場合は macOS launchd または Linux systemd

安定したブートストラップ入口:

```bash
./.wt/setup
```

手動で行う場合:

```bash
npm install
npm run build
PORT=18470 npm run start
```

開発サーバー:

```bash
npm run dev
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
- `npm run test:e2e` (Playwright): `tests/e2e` 配下のブラウザ E2E テスト。
- 現在、`tests/e2e` にはコミット済みの Playwright テストが存在しないため、`npm run test:e2e` は `--pass-with-no-tests` により実行経路の確認のみを行います。
- Playwright テストは事前にアプリを起動済みであることが前提です（`npm run dev` など）。

## ディレクトリ構成（概要）

```text
hermes-agents/
├── app/                    # Next.js App Router (UI / API)
├── components/             # 共有 UI コンポーネント
├── src/lib/                # ファイルシステム/Env/SkillLink ヘルパー
├── docs/                   # 要件・設計ドキュメント
├── hosting/                # launchd/systemd/Caddy 用ホスティング設定
├── openspec/changes/       # Conflux 変更提案
├── tests/
│   ├── api|components|hooks|lib|ui/  # Vitest ユニット/コンポーネント/統合寄りテスト
│   └── e2e/                         # Playwright ブラウザ E2E テスト（事前にアプリ起動が必要）
├── runtime/                # 実行時データ（agents/globals/logs/templates/partials）
└── AGENTS.md               # 開発者向け必読ガイド
```

## 貢献方法

提案フロー、品質ゲート、実装前提は [`CONTRIBUTING.md`](./CONTRIBUTING.md) を参照してください。

## バージョニングとリリース

このプロジェクトは成熟するまで SemVer ベースで運用します。

- バージョンの source of truth: `package.json`
- 変更点の案内先: GitHub Releases（利用者向け変更点と運用者向けアップグレード注意を記載）

自動化された release tooling を追加するまでは、`npm run test`、`npm run typecheck`、`npm run lint`、`npm run format:check` をすべて通したクリーンなコミットからタグ付きリリースを作成してください。

## ライセンス

MIT。[`LICENSE`](./LICENSE) を参照してください。
