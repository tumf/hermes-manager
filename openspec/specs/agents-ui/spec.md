## Requirements

### Requirement: Agents list dashboard page

The main page (`app/page.tsx`) displays a live list of agents and provides controls
for lifecycle management without requiring authentication.

#### Scenario: Page renders agents list from API

Given the /api/agents endpoint returns a list of agents
When a user opens the app root URL
Then the page displays each agent with its name, enabled status badge, and launchd status indicator

#### Scenario: Enabled badge shows correct visual state

Given an agent with enabled=true and another with enabled=false
When the agents list renders
Then the enabled agent shows a green Badge
And the disabled agent shows a grey or muted Badge

### Requirement: Per-agent lifecycle controls

Each agent row provides Start, Stop, Delete, and Copy actions.

#### Scenario: Start button triggers launchd start and refreshes list

Given an agent that is currently stopped
When the user clicks the Start button for that agent
Then a request is sent to the launchd control endpoint to start the agent
And the agents list refreshes to reflect the updated status

#### Scenario: Stop button triggers launchd stop and refreshes list

Given an agent that is currently running
When the user clicks the Stop button for that agent
Then a request is sent to the launchd control endpoint to stop the agent
And the agents list refreshes to reflect the updated status

#### Scenario: Delete button shows confirmation dialog before deleting

Given an agent named alpha in the list
When the user clicks the Delete button for alpha
Then a confirmation AlertDialog appears with the agent name
And clicking Confirm sends DELETE /api/agents?name=alpha
And the list refreshes without alpha

#### Scenario: Copy button opens dialog and creates new agent

Given an agent named beta in the list
When the user clicks the Copy button for beta
Then a dialog appears with a text input for the new name
And submitting a valid name sends POST /api/agents/copy with {from:"beta", to:newName}
And the list refreshes with the new agent added

### Requirement: Add Agent form

A visible form allows the operator to create a new agent.

#### Scenario: Add Agent form submits and refreshes list

Given the Add Agent form is visible on the page
When the user enters a valid agent name and submits
Then POST /api/agents is called with the name
And on success the agents list refreshes showing the new agent

#### Scenario: Add Agent form shows error for invalid name

Given the Add Agent form is visible
When the user enters a name with disallowed characters and submits
Then the form shows an inline error message
And no POST request is made or the API returns 400

### Requirement: Responsive layout

The page layout adapts to mobile and desktop viewports.

#### Scenario: Page is usable on narrow viewport

Given the user opens the page on a mobile-width viewport
When the agents list renders
Then all key information and action buttons are visible without horizontal scrolling

### Requirement: agent-detail-metadata-display

エージェント詳細ページの共通部（タブ上部）は、メタデータを読み取り専用で表示する。

#### Scenario: 共通部に name / description / tags が表示される

**Given**: エージェントの meta.json に `name: "本番Bot"`, `description: "顧客対応用"`, `tags: ["prod", "telegram"]` が設定されている
**When**: `/agents/:id` を表示する
**Then**: 共通部に name `"本番Bot"` とagentId、description テキスト、tags バッジが表示される
**And**: 共通部に編集フォーム（Input / Textarea / Save ボタン）は表示されない

#### Scenario: 未設定フィールドは非表示

**Given**: エージェントの meta.json に `name: ""`, `description: ""`, `tags: []` が設定されている
**When**: `/agents/:id` を表示する
**Then**: 共通部に description テキストと tags バッジは表示されない

### Requirement: agent-detail-metadata-tab

エージェント詳細ページに Metadata タブがあり、name / description / tags を編集できる。

#### Scenario: Metadata タブで編集・保存

**Given**: `/agents/:id` を表示し Metadata タブを選択している
**When**: name を `"新名前"` に変更して Save ボタンを押す
**Then**: `PUT /api/agents/:id/meta` が呼ばれ、保存成功後に共通部の name 表示が `"新名前"` に更新される

#### Scenario: デフォルトタブは Metadata

**Given**: ハッシュなしで `/agents/:id` を開く
**When**: ページが表示される
**Then**: Metadata タブがアクティブである

#### Scenario: ハッシュ指定で直接遷移

**Given**: `/agents/:id#metadata` にアクセスする
**When**: ページが表示される
**Then**: Metadata タブがアクティブである

### Requirement: Agents list dashboard page

The main page (`app/page.tsx`) displays a live list of agents and provides localized lifecycle-management controls without requiring authentication.

#### Scenario: Page renders localized agents list chrome

Given the /api/agents endpoint returns a list of agents
When a user opens the app root URL with locale `de`
Then the page displays each agent with a German-localized heading, column labels, and action labels
And the agent data values themselves are still rendered correctly.

### Requirement: Add Agent form

A visible localized form allows the operator to create a new agent.

#### Scenario: Add Agent form labels follow active locale

Given the active UI locale is `es`
When the Add Agent dialog is opened
Then the dialog title, descriptions, field labels, placeholders, validation copy, and submit/cancel actions are shown in Spanish.

#### Scenario: Add Agent success toast follows active locale

Given the active UI locale is `vi`
When a new agent is created successfully
Then the success toast is rendered in Vietnamese.

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