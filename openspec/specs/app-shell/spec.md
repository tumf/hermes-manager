# App Shell Spec

## Requirements

### Requirement: Sidebar navigation with active state

The application MUST render a responsive sidebar containing links to Agents (/)
and Globals (/globals). Each nav item shows an icon and label, and the active
route is visually highlighted.

#### Scenario: Desktop active state

Given the user is on /globals,
When the layout renders,
Then the sidebar highlights the Globals item and not the Agents item.

#### Scenario: Mobile sheet sidebar

Given the viewport width is small,
When the user taps the hamburger button,
Then a sheet-based sidebar opens with the same navigation links.

### Requirement: Shared components available

The project MUST include a StatusBadge component supporting statuses running,
stopped, and unknown using shadcn Badge variants; and a ConfirmDialog component
for destructive actions using shadcn AlertDialog.

#### Scenario: StatusBadge variants

When StatusBadge is rendered for each status,
Then the color and label correspond to the status.

#### Scenario: ConfirmDialog confirm flow

When the ConfirmDialog is opened and the user confirms,
Then the provided onConfirm callback is invoked and the dialog closes.

### Requirement: Globals management UI

The /globals page MUST display and allow inline add/edit/delete of global env
vars (scope="global"), and show a preview of the generated .env content.

#### Scenario: Add a new global variable

When the user adds a key/value and saves,
Then the table updates and the .env preview reflects the change.

#### Scenario: Delete a global variable

When the user deletes a row and confirms,
Then the row is removed and the .env preview updates accordingly.

### Requirement: Agent detail page scaffold with tabs

The app MUST include app/agents/[name]/page.tsx rendering tabs: Memory, Config,
Env, Skills, Logs.

#### Scenario: Tab navigation shows placeholders

When a user navigates to /agents/alice,
Then the page shows the tabbed layout with placeholders for each tab.

### Requirement: Sidebar navigation with active state

The application MUST render a responsive sidebar containing links to Agents (/), Globals (/globals), Templates (/templates), and Partials (/partials). Each nav item shows an icon and a locale-aware label, and the active route is visually highlighted.

#### Scenario: Desktop active state

Given the user is on /globals,
When the layout renders,
Then the sidebar highlights the localized Globals item and not the localized Agents item.

#### Scenario: Mobile sheet sidebar

Given the viewport width is small,
When the user taps the hamburger button,
Then a sheet-based sidebar opens with the same localized navigation links.

### Requirement: Shared language switching in app chrome

The application MUST provide a shared language switcher in the app shell that allows the operator to change the UI locale among `ja`, `en`, `zh-CN`, `es`, `pt-BR`, `vi`, `ko`, `ru`, `fr`, and `de`.

#### Scenario: Operator changes locale from shared shell

Given the user is viewing any application page,
When the user selects `fr` from the shared language switcher,
Then shared navigation and page chrome re-render using French labels.

#### Scenario: Selected locale persists across reload

Given the user previously selected `pt-BR`,
When the user reloads the page,
Then the application restores `pt-BR` as the active UI locale.

#### Scenario: Invalid stored locale falls back safely

Given the browser contains an unsupported stored locale value,
When the application initializes locale state,
Then the application falls back to the default locale,
And the UI continues rendering without runtime errors.

### Requirement: Locale-aware document language metadata

The application MUST keep the root document language metadata aligned with the effective UI locale.

#### Scenario: Html lang reflects selected locale

Given the active UI locale is `ko`,
When the layout is rendered,
Then the root `html` element has `lang="ko"`.

### Requirement: Sidebar navigation with active state

アプリケーションの shared shell と locale-aware navigation は、製品名として `Hermes Manager` を正準表示しなければならない。shared app chrome、ページタイトル、または主要ヘッダーで旧名称 `Hermes Agents WebApp` を表示してはならない。

#### Scenario: Shared shell shows the renamed product

**Given**: オペレーターが任意のアプリケーションページを表示している
**When**: shared shell または主要ページヘッダーを見る
**Then**: 製品名は `Hermes Manager` として表示される
**And**: 旧名称 `Hermes Agents WebApp` は app chrome に表示されない
