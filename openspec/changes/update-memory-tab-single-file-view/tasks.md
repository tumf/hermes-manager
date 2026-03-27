## Implementation Tasks

- [ ] Agent 詳細 Memory タブのレイアウトを単一エディタ表示に変更する（verification: `app/agents/[name]/page.tsx` で Memory 表示が単一編集領域になっている）
- [ ] Memory タブに `AGENTS.md` / `SOUL.md` の切替 UI を追加する（verification: `app/agents/[name]/page.tsx` で2ファイルの選択 UI が定義されている）
- [ ] 選択中ファイルのみ読み込み・表示する状態管理に更新する（verification: 選択変更で対応ファイル内容のみ表示されることを UI テストで確認）
- [ ] 未保存変更がある状態でのファイル切替確認ダイアログを追加する（verification: 未保存時に切替操作で確認 UI が表示されることをテストで確認）
- [ ] 保存処理を「現在選択中ファイルのみ送信」に統一する（verification: `/api/files` 呼び出し payload の `path` が選択中ファイルと一致することをテストで確認）
- [ ] Agent 詳細画面の UI テストを追加/更新する（verification: `tests/ui` 配下に Memory 単一表示と切替挙動のテストが追加される）
- [ ] ドキュメントの UI 設計記述を更新する（verification: `docs/design.md` の Agent 詳細説明が単一ファイル切替表示に更新される）
- [ ] 検証コマンドを実行する（verification: `npm run test && npm run typecheck && npm run lint` が成功する）

## Future Work

- なし
