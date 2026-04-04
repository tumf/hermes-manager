# Design: Shared SOUL partials

## Premise

- Hermes runtime は引き続き agent home 直下の `SOUL.md` を単一ファイルとして読む
- WebApp 側だけで partial を解決し、展開済み成果物を `SOUL.md` に書き戻す
- 既存 agent の自動移行は行わず、`SOUL.src.md` がある agent だけが partial モードを使う

## Storage

### Shared partial store

```text
runtime/partials/
  {name}.md
```

- partial 名は `[a-zA-Z0-9_-]+`
- 実ファイル名は `{name}.md`
- 内容は Markdown の生テキスト

### Agent-local files

```text
runtime/agents/{agentId}/
  SOUL.md      # assembled output for Hermes runtime
  SOUL.src.md  # optional source file with partial references
```

## Assembly model

### Source modes

- **Legacy mode**: `SOUL.src.md` が存在しない agent は `SOUL.md` を直接編集する
- **Partial mode**: `SOUL.src.md` が存在する agent は `SOUL.src.md` を編集し、保存時に `SOUL.md` を再生成する

### Reference syntax

```md
{{partial:directory-structure}}
```

- `partial` キーワードは固定
- partial 名は `[a-zA-Z0-9_-]+`
- `.md` 拡張子は source に書かない

### Resolution rules

- `{{partial:name}}` を `runtime/partials/name.md` の全文で置換する
- nested partial は当面禁止し、partial 本文内の `{{partial:...}}` はエラーとして扱う
- 未存在 partial を参照した場合は assembly failure とし、`SOUL.md` を更新しない
- `SOUL.src.md` への保存と `SOUL.md` への再生成は一体として扱い、片方だけ成功させない

## Rebuild strategy

### On source save

`PUT /api/files` with `path=SOUL.src.md`

1. 入力を検証する
2. source を基に assembly を試みる
3. 成功時のみ `SOUL.src.md` と `SOUL.md` を原子的に更新する
4. 失敗時は 422 を返し、両ファイルを変更しない

### On partial update

`POST/PUT /api/partials`

1. partial を保存する
2. `runtime/agents/*/SOUL.src.md` をスキャンする
3. 当該 partial を参照する agent だけを再 assembly する
4. 成功した agent 一覧をレスポンスへ含められる

### On partial delete

- 利用中 agent が 1 件でもあれば 409 を返す
- 強制削除は今回扱わない

## API surfaces

### `/api/files`

Allowed paths を以下へ拡張する。

- `SOUL.md`
- `SOUL.src.md`
- `memories/MEMORY.md`
- `memories/USER.md`
- `config.yaml`

Behavior:

- `GET path=SOUL.md`: assembled output を返す
- `GET path=SOUL.src.md`: source を返す。未導入なら 404
- `PUT path=SOUL.md`: `SOUL.src.md` がない legacy agent のみ許可
- `PUT path=SOUL.src.md`: assembly 成功時のみ source/output を更新

### `/api/partials`

- `GET /api/partials` → partial 一覧 + `usedBy`
- `GET /api/partials?name=...` → 個別内容
- `POST /api/partials` → 新規作成
- `PUT /api/partials` → 更新 + rebuild
- `DELETE /api/partials?name=...` → 未使用時のみ削除

## UI updates

### Memory tab

SOUL セクションは agent の mode に応じて振る舞いを切り替える。

- legacy mode: `SOUL.md` を従来どおり編集
- partial mode: `SOUL.src.md` を編集し、`SOUL.md` assembled view を確認可能にする

追加 UI:

- Enable partials ボタン
- partial 挿入 UI
- assembled `SOUL.md` 確認 UI

### Partials page

新規 `/partials` ページを追加する。

- partial 一覧
- 新規作成 / 編集 / 削除
- `usedBy` 表示
- 削除不可理由の表示

## Why scan instead of indexing

partial 更新時の逆引きは保存時スキャン方式を採用する。

- 現行の想定 agent 数では `runtime/agents/*/SOUL.src.md` の全走査で十分軽量
- 永続インデックスの整合性管理が不要
- 将来対象ファイルが増えた場合にのみ逆引きインデックス導入を再検討する
