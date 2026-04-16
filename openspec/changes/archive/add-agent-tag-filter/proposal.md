---
change_type: implementation
priority: medium
dependencies: []
references:
  - docs/requirements.md
  - docs/design.md
  - openspec/specs/agents-ui/spec.md
  - app/page.tsx
  - src/components/agents-list-content.tsx
  - src/components/agent-card.tsx
  - src/lib/translations/ja.ts
  - tests/ui/agents-page.test.tsx
---

# エージェント一覧にタグ絞り込みを追加する

**Change Type**: implementation

## Premise / Context

- Hermes Manager の主戦場は multi-agent operations であり、Agents 一覧は fleet を素早く棚卸しするための中心 UI である。
- 現在の Agents 一覧では各 agent の tags は表示されているが、タグを使って一覧を絞り込むことはできない。
- `app/page.tsx` は `/api/agents` で取得した一覧をクライアント側 state に保持し、`AgentsListContent` にそのまま渡して描画している。
- 既存実装には tags の表示パターン、ローカライズ辞書、UI テスト (`tests/ui/agents-page.test.tsx`) がすでに存在する。
- API 変更は不要で、既存の `tags: string[]` を用いたクライアント側 filtering で要件を満たせる。

## Problem / Context

agent 数が増えると、operator は特定の役割や環境（例: `prod`, `staging`, `telegram`, `ops`）を持つ agent 群だけをすぐ見たいが、現状は一覧を目視で探すしかない。

この制約により、次の運用上の無駄が発生する。

- 同じタグを持つ agent 群の棚卸しに時間がかかる
- fleet の一部だけに対して起動状態やメモリ使用量を確認したい時に視認コストが高い
- tags を付ける価値が一覧探索に十分還元されていない

## Proposed Solution

Agents 一覧ページに、既存 metadata tags を利用したクライアントサイドのタグ絞り込み機能を追加する。

### UI 方針

- 一覧の上部に、現在ロード済み agent からユニークな tags を収集して filter controls を表示する
- operator は 1 個以上のタグを選択して絞り込める
- 選択中のタグは明確に active state で表示する
- フィルタ解除を 1 アクションで行えるようにする
- tags を持たない agent しか存在しない場合は、不要な filter chrome を表示しないか、操作不能な UI を出さない

### 振る舞い方針

- API は追加せず、`/api/agents` の結果に対してクライアント側で filtering する
- 選択タグがない場合は全 agent を表示する
- 複数タグ選択時の条件は OR マッチとし、いずれかの選択タグを持つ agent を表示する
- 絞り込み後の件数が 0 件になった場合は、空状態メッセージとフィルタ解除導線を表示する
- batch status hydration の既存挙動は維持し、絞り込みは name / label / tags / memory の先行描画を阻害しない

### なぜ Hermes Manager が持つべきか

この機能は単なる一覧装飾ではなく、multi-agent operations における fleet ergonomics を改善する。operator が「どの agent 群が何者か」を素早く把握し、役割単位で運用確認できるため、本製品の control plane としてのポジショニングに合致する。

## Acceptance Criteria

1. Agents 一覧ページに、現在存在する tags を使った絞り込み UI が表示される
2. タグ未選択時は全 agent が表示される
3. 1 個のタグを選択すると、そのタグを持つ agent だけが表示される
4. 複数タグを選択すると、いずれかのタグを持つ agent が表示される
5. タグ絞り込み後も既存の start / stop / restart / copy / delete 導線は表示対象 agent に対して機能する
6. 絞り込み結果が 0 件のときは、その状態が分かるメッセージとフィルタ解除導線が表示される
7. tags を持つ agent が存在しない場合でも一覧ページは正常動作し、不要な filter UI により混乱を生まない
8. UI テストで単一タグ・複数タグ・解除・0件状態が検証される

## Out of Scope

- サーバーサイドの tags 検索 API 追加
- タグの AND 条件絞り込み
- タグの作成・編集導線の追加変更
- URL クエリや localStorage へのフィルタ状態永続化
