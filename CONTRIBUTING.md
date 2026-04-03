# Contributing

hermes-agents への貢献ありがとうございます。
このドキュメントでは、変更提案から実装・検証までの最小手順を示します。

詳細な開発ルール・設計方針は必ず以下を参照してください。

- 開発者ガイド: [`AGENTS.md`](./AGENTS.md)
- 要件定義: [`docs/requirements.md`](./docs/requirements.md)
- 設計: [`docs/design.md`](./docs/design.md)

## 1. 開発環境セットアップ

前提:

- Node.js 20+
- npm

```bash
npm install
```

開発サーバー:

```bash
npm run dev
```

## 2. コーディング時の基本ルール

- 実装前に `AGENTS.md` のルールを確認する
- 要件/設計に変更が必要な場合、**先に `docs/` を更新してから実装** する
- API 入力は zod で検証する
- パス操作は path traversal 対策（resolve + startsWith）を守る
- `launchctl` / `hermes` 実行は `execFile`（引数配列）を使う

## 3. Conflux Workflow（簡易）

1. 変更提案を作成または確認（`openspec/changes/<change-id>/`）
2. proposal / tasks / specs を更新
3. 実装して tasks を進める
4. 受け入れ確認後にアーカイブ

既存提案一覧:

```bash
python3 ~/.hermes/skills/cflx-proposal/scripts/cflx.py list
```

## 4. PR / コミット前チェック

以下をすべて通してください。

```bash
npm run test
npm run test:e2e
npm run typecheck
npm run lint
npm run format:check
```

必要に応じてビルド確認:

```bash
npm run build
```

## 5. ドキュメント整合性

- README/CONTRIBUTING には概要のみ記載し、詳細は `AGENTS.md` と `docs/` へリンクする
- 実装とドキュメントに差分がある場合、差分を解消してからレビュー依頼する
- テスト境界に関するルールはこの文書および `README.md`（英語）/`README_ja.md`（日本語）で明示する
