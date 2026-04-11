---
change_type: implementation
priority: medium
dependencies: []
references:
  - src/components/chat-tab.tsx
  - tests/components/chat-input.test.tsx
  - tests/components/chat-messages.test.tsx
  - tests/components/session-list.test.tsx
  - docs/design.md
---

# Refactor chat tab flow

**Change Type**: implementation

## Problem / Context

- `src/components/chat-tab.tsx` は 639 行あり、session loading、message loading、SSE parsing、auto-scroll、mobile drawer、rendering を単一 component で抱えている。
- `useEffect` に `eslint-disable` が 2 箇所あり、依存関係の意図が component 構造から読み取りづらい。
- SSE ストリーミング処理、session panel 描画、message composer が密結合しているため、バグ修正時に unrelated な state 変更を壊しやすい。

## Evidence

- `src/components/chat-tab.tsx:145` と `src/components/chat-tab.tsx:150` に `react-hooks/exhaustive-deps` の抑制がある。
- `src/components/chat-tab.tsx:216` 以降で submit / optimistic UI / SSE parsing / reload を 1 つの関数で処理している。
- `src/components/chat-tab.tsx:324` 以降で session panel、chat viewport、mobile overlay を同一 component が直接描画している。

## Proposed Solution

- chat tab を、data-flow hook（sessions/messages/submit/streaming）と presentation component（session list、message list、composer、mobile sheet）に分離する。
- SSE parsing と optimistic message 更新を専用 helper または hook に切り出し、effect dependency の抑制を不要にする方向で設計する。
- 既存 UX・API 契約・表示文言を変えず、characterization test で streaming / retry / session selection / mobile panel の主要挙動を固定する。

## Acceptance Criteria

- Chat タブの UI 挙動（session 切替、message 送信、streaming、retry、mobile sessions panel）は現状どおり維持される。
- `react-hooks/exhaustive-deps` 抑制に依存しない構造へ整理するか、抑制理由が局所化されて review 可能な単位に縮小される。
- SSE parsing と optimistic update のテスト可能な境界が作られ、回帰防止テストが追加される。
- `npm run test`、`npm run typecheck`、`npm run lint` が通過する。

## Out of Scope

- Chat API 仕様変更
- 新しい chat 機能追加
- 文言やレイアウトのデザイン変更
