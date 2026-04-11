## MODIFIED Requirements

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
