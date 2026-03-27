# Update Memory Tab to Single-File View

## Problem/Context

Agent 詳細の Memory タブで `AGENTS.md` と `SOUL.md` が横並び表示されており、各エディタの横幅が狭く編集しづらい。

## Proposed Solution

Memory タブの表示を「1画面1ファイル」に変更し、`AGENTS.md` と `SOUL.md` はタブ/セグメント切替で表示する。

- 同時2カラム表示を廃止
- Memory タブ内で表示対象ファイルを `AGENTS.md` / `SOUL.md` から選択
- 選択中の1ファイルのみエディタを表示
- 保存は現在選択中ファイルに対して実行
- ファイル切替時に未保存変更がある場合は確認ダイアログで破棄確認

## Acceptance Criteria

1. Agent 詳細の Memory タブで、同時に表示される編集領域は常に1つである。
2. `AGENTS.md` と `SOUL.md` を UI で切り替えでき、選択中ファイル内容が表示される。
3. 片方のファイルに未保存変更がある状態で切り替えると、確認なしでは切り替わらない。
4. 保存操作は表示中ファイルのみを対象に `/api/files` へ送信する。
5. 既存の Config / Env / Skills / Logs タブの挙動は変わらない。

## Out of Scope

- Files API の仕様変更
- Memory 以外タブの UI 改修
- マルチファイル同時保存/比較表示機能
