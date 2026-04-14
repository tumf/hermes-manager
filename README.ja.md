# Hermes Manager

[![日本語](https://img.shields.io/badge/%E6%97%A5%E6%9C%AC%E8%AA%9E-blue?style=flat-square)](./README.ja.md) [![English](https://img.shields.io/badge/English-blue?style=flat-square)](./README.md) [![简体中文](https://img.shields.io/badge/%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-blue?style=flat-square)](./README.zh-CN.md) [![Español](https://img.shields.io/badge/Espa%C3%B1ol-blue?style=flat-square)](./README.es.md) [![Português%20(BR)](<https://img.shields.io/badge/Portugu%C3%AAs%20(BR)-blue?style=flat-square>)](./README.pt-BR.md) [![한국어](https://img.shields.io/badge/%ED%95%9C%EA%B5%AD%EC%96%B4-blue?style=flat-square)](./README.ko.md) [![Français](https://img.shields.io/badge/Fran%C3%A7ais-blue?style=flat-square)](./README.fr.md) [![Deutsch](https://img.shields.io/badge/Deutsch-blue?style=flat-square)](./README.de.md) [![Русский](https://img.shields.io/badge/%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9-blue?style=flat-square)](./README.ru.md) [![Tiếng%20Việt](https://img.shields.io/badge/Ti%E1%BA%BFng%20Vi%E1%BB%87t-blue?style=flat-square)](./README.vi.md)

![Hermes Manager スクリーンショット](./docs/images/ss-agents-1.png)

Hermes Manager は、1 台のホスト上で多数の Hermes Agent をまとめて運用するための Next.js 製コントロールプレーンです。
公式 Hermes dashboard が単一の Hermes インストールを管理する UI であるのに対し、Hermes Manager は feature parity な置き換えではなく、trusted-network / イントラネット環境でのマルチエージェント運用に位置づけられています。agent のプロビジョニング、テンプレート/partials 適用、agent ごとの環境変数レイヤリング、ローカルサービス制御、設定・ログ・チャット履歴の横断管理を重視しています。

特に、Hermes Manager のサブエージェント機能は「agent が別の agent を安全に呼び出すための managed な枠組み」を提供します。README に載せている図はその活用例のひとつであり、Project A / Project B / Client C のようなビジネスドメイン別 agent から、Python Developer、Marketing Analyzer、Web Designer、Flutter Developer のような専門 agent へ委譲する運用モデルを例示しています。つまり、製品が固定の組織構造を前提にしているのではなく、operator が自分の fleet 設計に応じて domain agent と specialist agent の関係を構成できる、というのがこの機能の本質です。

Hermes Manager 自体は、どの agent がどの agent を呼べるか、何段まで委譲できるか、循環や再訪をどう防ぐかを policy と dispatch 経路として管理し、許可された委譲だけを再現可能に運用できるようにします。

加えて、複数 agent の SOUL を共通部品で保守できる「partial prompt」運用も本アプリの中核的な差別化要素です。各 agent は runtime 互換の展開済み `SOUL.md` を持ったまま、編集用の `SOUL.src.md` から共有 partial を `embed/include` できます。これにより、複数 agent にまたがる共通ポリシーや運用規約を 1 か所で更新しつつ、agent ごとの差分だけを個別に保てます。

## 本アプリの特徴

- 1 ホスト上の複数エージェントを集中運用する control plane
- agent 間の managed delegation / dispatch を提供するサブエージェント運用基盤
- per-agent delegation policy による委譲先制御、循環防止、最大 hop 制御
- domain agent / specialist agent など、operator が任意の役割分担モデルを構成可能
- templates / partials / memory assets を使った再利用可能なプロビジョニング
- 共有 partial prompt を複数 agent の `SOUL.md` に埋め込める SOUL composability
- Hermes runtime 互換を維持する assembled `SOUL.md` 自動再生成
- agent ごとの差分と fleet 全体の共通規約を分離して保守できる運用モデル
- launchd / systemd と統合されたローカルサービス制御

### Managed Subagent Delegation

![Managed subagent delegation の構成図](./docs/images/hermes-managed-subagent-delegation-org.png)

この図は、Hermes Manager のサブエージェント機能そのものを固定的な組織図として示しているのではなく、「agent 間委譲の枠組みをどう活用できるか」の一例です。例では、Project A / Project B / Client C のようなビジネスドメイン担当 agent が、Python Developer、Marketing Analyzer、Web Designer、Flutter Developer などの専門家 agent を subagent として呼び分ける運用モデルを描いています。

重要なのは、Hermes Manager が提供するのは agent 間の managed delegation / dispatch の仕組みであり、domain agent と specialist agent という役割分担そのものは operator が自由に設計できるという点です。つまり、この図は代表的ユースケースの説明であって、製品がこの構成だけを前提にしているわけではありません。

Hermes Manager は、どの agent がどの agent を呼べるか、何段まで委譲できるか、同一 workflow 内での循環や再訪をどう防ぐかを policy と dispatch 経路として一元管理します。結果として、単一 agent を深く触る dashboard ではなく、複数 agent を役割分担させながら安全に組み合わせる local fleet control plane という本製品の立ち位置が明確になります。

### Shared Partial Prompt / SOUL Composability

![Partial prompt の構成図](./docs/images/hermes-partial-prompts.png)

この構成では、共通の partial prompt を shared asset として管理し、複数の agent の `SOUL.src.md` から `embed/include` して最終的な `SOUL.md` を組み立てます。operator は、全 agent に共通するルール・安全方針・ホスト運用規約を partial 側へ集約しつつ、各 agent には役割固有の差分だけを書けます。結果として、共通指示の同期漏れを減らし、fleet 全体の SOUL 保守を一貫した形で行えます。

## ドキュメントマップ

- 要件定義: [`docs/requirements.md`](./docs/requirements.md)
- アーキテクチャ / API 設計: [`docs/design.md`](./docs/design.md)
- 英語版 README: [`README.md`](./README.md)
- 貢献ガイド: [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- セキュリティ報告: [`SECURITY.md`](./SECURITY.md)
- 利用者向け案内: [`SUPPORT.md`](./SUPPORT.md)

## 概要

Hermes Manager では、ブラウザ UI から次の操作を行えます。

- 1 ホスト上の複数エージェントの集中運用
- エージェントのプロビジョニング、複製、削除
- launchd（macOS）/ systemd（Linux）経由の起動・停止・再起動
- `SOUL.md`、`SOUL.src.md`、`memories/MEMORY.md`、`memories/USER.md`、`config.yaml`、`.env` の編集
- visibility メタデータ付きの global / agent 環境変数レイヤリング管理
- templates / partials の再利用とローカルスキルカタログからのスキル equip
- ローカルサービス制御、ログ、Cron ジョブ、チャットセッションの確認

## 安全性 / 信頼境界

このプロジェクトは trusted-network / イントラネット運用を前提にしています。
公開インターネット向け認証、多人数向けの権限分離、外部公開のための防御はデフォルトでは含みません。
イントラネット外で運用する場合は、必ず前段に独自の認証・アクセス制御を追加してください。

## スクリーンショット

### Agents 一覧

![Hermes Manager スクリーンショット](./docs/images/ss-agents-1.png)

### メモリ管理

![Hermes Manager メモリ管理画面](./docs/images/ss-agent_memory-1.png)

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
hermes-manager/
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
