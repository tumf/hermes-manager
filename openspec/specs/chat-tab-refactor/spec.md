## Requirements

### Requirement: chat tab flow separates streaming state management from presentation

Chat タブの実装は、session/message の取得、message 送信、SSE streaming、optimistic update の state 管理を、描画ロジックから分離できる構造で提供しなければならない。内部構造を整理しても、既存 UI 挙動と `/api/agents/{id}/chat` への依存契約を変えてはならない。

分離境界の方針:

- data-flow hook (`useChatFlow` 相当) が session/message 取得、submit、SSE streaming、optimistic update、retry state を管理する。
- SSE chunk parsing (`parseSseChunk`) は純粋関数として hook 外に切り出し、unit test で独立検証可能にする。
- optimistic message 挿入は hook 内で完結させ、presentation は messages 配列を受け取るだけにする。
- `react-hooks/exhaustive-deps` 抑制は、hook 内部のコールバック安定化 (`useCallback` / ref pattern) で解消または局所化する。
- presentation component は hook から返る state と callback のみに依存し、fetch / SSE を直接触らない。

#### Scenario: streaming response still updates the visible assistant message

**Given**: オペレーターが Chat タブで message を送信し、upstream が SSE で assistant delta を返す
**When**: chat tab implementation が streaming event を処理する
**Then**: 直近の assistant message は受信順に delta を連結して表示される
**And**: streaming 完了後に session 一覧と選択中 session の messages を再読み込みする

#### Scenario: retry after send failure re-sends the last user message

**Given**: message 送信が失敗し、error 状態になっている
**When**: オペレーターが retry ボタンを押す
**Then**: 直前に送信を試みた user message がそのまま再送される
**And**: 成功すれば通常の streaming フローに入る

#### Scenario: session selection remains independent from mobile sessions panel state

**Given**: モバイル表示で sessions panel が開いている
**When**: オペレーターが session を選択する
**Then**: 対応する messages が読み込まれる
**And**: sessions panel は閉じる
**And**: message list / composer の挙動は desktop と同じ契約を維持する

### Requirement: characterization tests guard existing chat UX during refactor

refactor 前に characterization test を配置し、streaming delta 連結、retry 再送、session 切替による message 読み込み、mobile panel の開閉が回帰なく維持されることを自動検証する。テストは `tests/components/chat-tab-characterization.test.tsx` に集約し、mock fetch + ReadableStream で SSE を模倣する。
