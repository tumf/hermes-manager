## Implementation Tasks

- [x] Agent 詳細 Memory タブのレイアウトを単一エディタ表示に変更する（verification: `app/agents/[name]/page.tsx` で Memory 表示が単一編集領域になっている）
- [x] Memory タブに `AGENTS.md` / `SOUL.md` の切替 UI を追加する（verification: `app/agents/[name]/page.tsx` で2ファイルの選択 UI が定義されている）
- [x] 選択中ファイルのみ読み込み・表示する状態管理に更新する（verification: 選択変更で対応ファイル内容のみ表示されることを UI テストで確認）
- [x] 未保存変更がある状態でのファイル切替確認ダイアログを追加する（verification: 未保存時に切替操作で確認 UI が表示されることをテストで確認）
- [x] 保存処理を「現在選択中ファイルのみ送信」に統一する（verification: `/api/files` 呼び出し payload の `path` が選択中ファイルと一致することをテストで確認）
- [x] Agent 詳細画面の UI テストを追加/更新する（verification: `tests/ui` 配下に Memory 単一表示と切替挙動のテストが追加される）
- [x] ドキュメントの UI 設計記述を更新する（verification: `docs/design.md` の Agent 詳細説明が単一ファイル切替表示に更新される）
- [x] 検証コマンドを実行する（verification: `npm run test && npm run typecheck && npm run lint` が成功する）

## Future Work

- なし

## Acceptance #1 Failure Follow-up

- [x] Agent 詳細ページのタブ構成を仕様通り Memory / Config / Env / Skills / Logs に復元し、Env/Skills タブを再表示する
- [x] Env / Skills タブが既存どおり動作することを UI テストで回帰防止する
- [x] 変更後に `npm run test && npm run typecheck && npm run lint` を再実行して成功を確認する
