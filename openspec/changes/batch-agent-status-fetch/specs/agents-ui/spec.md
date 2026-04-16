## MODIFIED Requirements

### Requirement: Agents list dashboard page

The main page (`app/page.tsx`) displays a live list of agents and provides localized lifecycle-management controls without requiring authentication. 一覧本体の描画は agent status の取得完了に依存せず、起動状態は後続の非同期 fetch で反映できなければならない。

#### Scenario: Page renders list before status hydration finishes

**Given**: `/api/agents` は成功するが agent status の追加取得には少し時間がかかる
**When**: ユーザーがトップページを開く
**Then**: 一覧の name / label / tags / memory など主要情報は先に描画される
**And**: status は後続の非同期 fetch 完了後に更新される

#### Scenario: Status hydration failure does not block the agents list

**Given**: `/api/agents` は成功するが batch status fetch の一部または全部が失敗する
**When**: ユーザーがトップページを開く
**Then**: Agents 一覧自体は表示され続ける
**And**: status 欄は loading または fallback 表示を行う
**And**: 一覧全体を failed-to-load 状態にしない
