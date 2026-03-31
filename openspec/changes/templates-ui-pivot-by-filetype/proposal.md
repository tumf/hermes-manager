# Templates ページの表示軸をファイル種別ベースに転置

## 背景

現在の `/templates` ページはテンプレート名（`default`, `research` 等）を親カードとし、その中にファイル（`AGENTS.md`, `SOUL.md`, `config.yaml`）をリストしている。
しかしテンプレート同士に関連性はなく、ツリー表記はかえってわかりにくい。

## 提案

表示軸を「テンプレート名 → ファイル」から「ファイル種別 → テンプレート名」に転置する。

### Before

```
[Card] default (3 files)
  ├── AGENTS.md   [Edit] [Delete]
  ├── SOUL.md     [Edit] [Delete]
  └── config.yaml [Edit] [Delete]  [Delete template]
```

### After

```
[Card] AGENTS.md
  ├── default   [Edit] [Delete]
  ├── research  [Edit] [Delete]
  └── develop   [Edit] [Delete]

[Card] SOUL.md
  ├── default   [Edit] [Delete]
  └── research  [Edit] [Delete]

[Card] config.yaml
  └── default   [Edit] [Delete]
```

## スコープ

- **変更対象:** `app/templates/page.tsx` の表示ロジックのみ
- **変更しないもの:**
  - `runtime/templates/{name}/{file}` のディレクトリ構造
  - `src/lib/templates.ts`、`app/api/templates/route.ts`
  - `src/components/add-agent-dialog.tsx`
  - Add Template File ダイアログの挙動

## 仕様

1. `FILE_NAMES` (`AGENTS.md`, `SOUL.md`, `config.yaml`) ごとに1枚のカードを表示
2. 該当ファイルを持つテンプレートが1つもないファイル種別のカードは非表示
3. カード内にそのファイルを持つテンプレート名をアルファベット順にフラットリスト表示
4. 展開/折りたたみのキーをファイル種別に変更し、**デフォルトですべて展開状態**
5. 各行の操作（編集・削除）は現在と同じファイル単位削除
6. テンプレート全体削除ボタンは廃止（ファイル単位削除で十分）
7. API レスポンスはそのまま使用し、フロント側でデータを転置

## タスク

- [ ] `app/templates/page.tsx` のカード表示を FILE_NAMES 軸に転置
- [ ] 展開状態を FILE_NAMES ベースに変更（デフォルト展開）
- [ ] テンプレート全体削除ボタンを削除
- [ ] 既存テストの修正（必要な場合）
