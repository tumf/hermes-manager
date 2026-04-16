## MODIFIED Requirements

### Requirement: Agents list dashboard page

The main page (`app/page.tsx`) displays a live list of agents and provides localized lifecycle-management controls without requiring authentication. 一覧本体の描画は agent status の取得完了に依存せず、起動状態は後続の非同期 fetch で反映できなければならない。さらに、operator は agent metadata tags を使って一覧を role / environment 単位に絞り込めなければならない。

#### Scenario: Tags filter shows agents matching the selected tag

**Given**: Agents 一覧に `prod` タグを持つ agent と持たない agent が含まれる
**When**: ユーザーが `prod` タグのフィルタを選択する
**Then**: 一覧には `prod` タグを持つ agent のみが表示される
**And**: 選択していないタグの agent は非表示になる

#### Scenario: Multiple selected tags use OR matching

**Given**: Agents 一覧に `prod`, `ops`, `staging` など複数タグを持つ agent 群が含まれる
**When**: ユーザーが `prod` と `ops` の両方を選択する
**Then**: 一覧には `prod` または `ops` のいずれかを持つ agent が表示される
**And**: どちらのタグも持たない agent は非表示になる

#### Scenario: Clearing tags filter restores the full list

**Given**: ユーザーが 1 個以上のタグで Agents 一覧を絞り込んでいる
**When**: ユーザーがフィルタ解除操作を行う
**Then**: 一覧は `/api/agents` で取得済みの全 agent 表示に戻る

#### Scenario: Empty filtered result provides recovery action

**Given**: ユーザーがタグを選択した結果、条件に一致する agent が 0 件になる
**When**: 絞り込み結果を表示する
**Then**: 一覧の代わりに 0 件であることが分かるメッセージが表示される
**And**: ユーザーは同じ画面上でフィルタ解除操作を行える

#### Scenario: Missing tags do not break the list

**Given**: 一覧内の全 agent が空の tags を持つ、または tags を持たない
**When**: ユーザーがトップページを開く
**Then**: Agents 一覧は通常どおり表示される
**And**: タグ絞り込み UI は不要な操作不能状態を表示しない
