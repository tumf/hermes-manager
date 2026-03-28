# Fix Memory Tab to Single-File View

## Problem / Context

Memory タブは `AGENTS.md` と `SOUL.md` を2カラムグリッドで同時に表示しているが、
テスト (`tests/ui/agent-detail-page.test.tsx`) は「1ファイルずつサブタブで切り替え表示」を期待している。
過去に `update-memory-tab-single-file-view` で実装されたが、何らかの理由で巻き戻っている。

## Proposed Solution

Memory タブ内にファイルごとのサブタブ（`AGENTS.md` / `SOUL.md`）を配置し、
選択中のファイルのみ `FileEditor` を1つ表示する。

- グリッドレイアウト (`grid gap-4 lg:grid-cols-2`) を削除
- ファイル切り替えボタンを追加
- 未保存変更がある状態で切り替えようとした場合、`window.confirm` で確認
- キャンセルされた場合は切り替えを阻止

## Acceptance Criteria

1. Memory タブで一度に1ファイルのみ表示される
2. ファイル名ボタンクリックで別ファイルに切り替わる
3. 未保存変更がある場合、切り替え前に確認ダイアログが表示される
4. 確認でキャンセルした場合、切り替えが阻止される
5. 既存テスト (`tests/ui/agent-detail-page.test.tsx`) が全て通る

## Out of Scope

- Files API の変更
- config.yaml エディタの変更
- 新規ファイル種別の追加
