---
change_type: implementation
priority: medium
dependencies: []
references:
  - src/components/app-shell.tsx
  - openspec/specs/app-shell/spec.md
  - docs/requirements.md
  - docs/design.md
---

# Add collapsible sticky sidebar

**Change Type**: implementation

## Problem / Context

- `src/components/app-shell.tsx` のデスクトップ用サイドバーは通常フロー内にあるため、右側メイン領域をスクロールすると一緒に流れてしまう。
- デスクトップ用サイドバーには開閉状態がなく、左ナビを閉じてメイン領域を広く使いたい operator workflow を支援できていない。
- モバイルでは Sheet による開閉がある一方、デスクトップでは persistent navigation の ergonomics が不足している。

## Proposed Solution

- shared app shell のデスクトップサイドバーを viewport 基準で sticky にし、右のメイン領域のみが縦スクロールするレイアウトへ調整する。
- デスクトップサイドバーに collapse / expand toggle を追加し、閉じた状態では icon-only rail として表示する。
- collapse state はクライアントに永続化し、ページ遷移や再読込後も operator の選択を維持する。
- locale-aware な aria-label / tooltip を追加して、折りたたみ状態でもナビゲーション操作性を維持する。

## Acceptance Criteria

- デスクトップでメイン領域をスクロールしてもサイドバーは viewport 左側に残り続ける。
- デスクトップでサイドバーを閉じる操作ができ、閉じた状態でも各ナビゲーションへ到達できる。
- 折りたたみ状態は再読込後も保持される。
- モバイルの Sheet ナビゲーション挙動は維持される。

## Out of Scope

- ページごとの個別ナビゲーション構成変更
- モバイル Sheet UX の全面 redesign
