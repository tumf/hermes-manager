## MODIFIED Requirements

### Requirement: readme-exists

リポジトリルートに README.md が存在し、プロジェクトの概要・技術スタック・セットアップ手順・開発コマンド・安全な運用前提（trusted network / intranet only）・バージョニング/リリース方針を記載する。

#### Scenario: 新規開発者がリポジトリを開く

**Given**: hermes-agents リポジトリをクローンした
**When**: README.md を開く
**Then**: プロジェクト概要、セットアップ手順（`.wt/setup` または `npm install` → `npm run build` → `PORT=18470 npm run start`）、開発コマンド一覧（dev, test, lint, typecheck, format:check）が記載されている
**And**: この WebApp が trusted network / intranet 運用を前提とし、外部公開向けの認証付き SaaS ではないことが明記されている
**And**: バージョンとリリースノートの扱いが案内されている

### Requirement: contributing-exists

リポジトリルートに CONTRIBUTING.md が存在し、貢献手順・コーディング規約への参照・高速/低速の品質ゲート・PR 前チェックリストを記載する。

#### Scenario: コントリビューターが変更を提出する

**Given**: hermes-agents に変更を加えたい
**When**: CONTRIBUTING.md を開く
**Then**: 開発環境セットアップ手順、AGENTS.md への参照、`.wt/setup` の案内、pre-commit/pre-push/CI の役割分担、PR 前に実行すべきコマンド（npm run test, npm run typecheck, npm run lint）が記載されている

### Requirement: baseline-oss-files-exist

リポジトリルートには公開リポジトリとして最低限必要な OSS 文書（`LICENSE`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `SUPPORT.md`）が存在しなければならない。

#### Scenario: 公開前チェックで必須文書を確認する

**Given**: メンテナーが hermes-agents を公開リポジトリとしてレビューしている
**When**: リポジトリルートを確認する
**Then**: `LICENSE`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `SUPPORT.md` が存在する
**And**: `SECURITY.md` は脆弱性報告を公開 issue ではなく非公開経路へ誘導する
**And**: `SUPPORT.md` は利用者向けの問い合わせ先と用途を案内する

### Requirement: local-quality-gates-are-split-by-cost

ローカル品質ゲートは、コミット時の高速チェックと push/CI 時の低速チェックに分離されなければならない。

#### Scenario: コントリビューターがコミットする

**Given**: コントリビューターが変更をコミットしようとしている
**When**: pre-commit hook が実行される
**Then**: staged file に対する高速チェック（例: lint-staged / formatting）が行われる
**And**: フルの typecheck / test / build のような重い処理は pre-commit では必須にならない

#### Scenario: コントリビューターが push する

**Given**: コントリビューターがブランチを push する
**When**: pre-push hook または CI が実行される
**Then**: typecheck・test・lint を含むより重い検証が走る

### Requirement: ci-validates-supported-platforms

公開リポジトリとしての CI は、文書化されたサポート対象に合わせて複数プラットフォームで主要チェックを実行しなければならない。

#### Scenario: pull request でクロスプラットフォーム検証する

**Given**: コントリビューターが pull request を作成した
**When**: GitHub Actions の CI が走る
**Then**: 少なくとも `ubuntu-latest` と `macos-latest` のジョブが実行される
**And**: `fail-fast: false` により片方の失敗でももう片方の結果が確認できる
**And**: lint, format:check, typecheck, test, build が検証される
