# Move Templates from DB to Filesystem

## Problem/Context

- テンプレートは現在 DB `templates` テーブルに保存されている
- テンプレートはコード/設定ファイルに近い性質を持ち、git 管理やエディタでの直接編集が自然
- DB に入れる必要性が薄い（大量データでもなく、リレーションも弱い）
- `default` テンプレートを seed データとして DB に入れる仕組みが必要になり、管理が煩雑
- ファイルシステムに置けば、default テンプレートは自動配置で済み、ユーザもエディタで直接編集可能

## Proposed Solution

### ストレージ変更

- テンプレート保存先を `templates` テーブル → `runtime/templates/` ディレクトリに変更
- 構造: `runtime/templates/{テンプレート名}/{ファイル名}`

```
runtime/templates/
├── default/
│   ├── AGENTS.md
│   ├── SOUL.md
│   └── config.yaml
└── telegram-bot/        # ユーザ定義の例
    ├── AGENTS.md
    └── config.yaml
```

- テンプレート名 = サブディレクトリ名
- 各ディレクトリ内のファイルは 3 種（`AGENTS.md`, `SOUL.md`, `config.yaml`）の任意サブセット

### default テンプレートの自動配置

- `ensureRuntimeDirectories()` 内（または同タイミング）で `runtime/templates/default/` の各ファイルを検査
- 存在しないファイルのみハードコード内容から自動生成（既存ファイルは上書きしない）
- 3 ファイルそれぞれ独立にチェック

### API 変更

| Method | Path                               | 変更内容                              |
| ------ | ---------------------------------- | ------------------------------------- |
| GET    | `/api/templates`                   | DB SELECT → ディレクトリ走査          |
| GET    | `/api/templates?name=...&file=...` | DB SELECT → ファイル読み込み          |
| POST   | `/api/templates`                   | DB INSERT → ファイル書き込み          |
| PUT    | `/api/templates`                   | DB UPDATE → ファイル上書き            |
| DELETE | `/api/templates`                   | DB DELETE → ファイル/ディレクトリ削除 |

### レスポンス型変更

```typescript
// テンプレート一覧
GET /api/templates → { name: string; files: string[] }[]

// 個別ファイル取得
GET /api/templates?name=default&file=AGENTS.md → { name: string; file: string; content: string }

// 作成・更新
POST/PUT /api/templates { name, file, content } → { name: string; file: string; content: string }

// 削除（ファイル単位またはディレクトリ単位）
DELETE /api/templates?name=...&file=... → { ok: true }
DELETE /api/templates?name=... → { ok: true }
```

### DB テーブル削除

- `db/schema.ts` から `templates` テーブル定義を削除
- 既存 DB に残るテーブルは放置（参照されなくなるため無害）

### エージェント作成時のテンプレート解決

```
1. runtime/templates/{templateName}/{fileName} を読む
2. なければ runtime/templates/default/{fileName} を読む
3. それもなければハードコードフォールバック
```

## Acceptance Criteria

- `runtime/templates/default/` 配下に `AGENTS.md`, `SOUL.md`, `config.yaml` が自動配置される
- 既存ファイルは自動配置で上書きされない
- `/api/templates` が fs ベースで CRUD 動作する
- エージェント作成時にテンプレート選択が fs から解決される
- `db/schema.ts` から `templates` テーブルが削除されている
- UI（`/templates` ページ）が fs ベース API に対応している
- 既存テスト・lint・typecheck がパスする
- `docs/design.md` が更新されている

## Out of Scope

- テンプレート内変数展開（`{{id}}` 等）
- テンプレートの import/export（zip 等）
- default テンプレート以外のプリセット同梱
