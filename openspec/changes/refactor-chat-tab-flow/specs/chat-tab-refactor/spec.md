## ADDED Requirements

### Requirement: chat tab flow separates streaming state management from presentation

Chat タブの実装は、session/message の取得、message 送信、SSE streaming、optimistic update の state 管理を、描画ロジックから分離できる構造で提供しなければならない。内部構造を整理しても、既存 UI 挙動と `/api/agents/{id}/chat` への依存契約を変えてはならない。

#### Scenario: streaming response still updates the visible assistant message

**Given**: オペレーターが Chat タブで message を送信し、upstream が SSE で assistant delta を返す
**When**: chat tab implementation が streaming event を処理する
**Then**: 直近の assistant message は受信順に delta を連結して表示される
**And**: streaming 完了後に session 一覧と選択中 session の messages を再読み込みする

#### Scenario: session selection remains independent from mobile sessions panel state

**Given**: モバイル表示で sessions panel が開いている
**When**: オペレーターが session を選択する
**Then**: 対応する messages が読み込まれる
**And**: sessions panel は閉じる
**And**: message list / composer の挙動は desktop と同じ契約を維持する
