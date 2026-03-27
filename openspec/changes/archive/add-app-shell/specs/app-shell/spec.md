# App Shell Spec

## ADDED Requirements

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
