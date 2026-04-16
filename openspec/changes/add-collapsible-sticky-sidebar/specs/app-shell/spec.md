## MODIFIED Requirements

### Requirement: Sidebar navigation with active state

The application MUST render a responsive sidebar containing links to Agents (/), Globals (/globals), Templates (/templates), and Partials (/partials). Each nav item shows an icon and a locale-aware label, and the active route is visually highlighted.

On desktop viewports, the shared shell MUST keep the sidebar visible while the main content pane scrolls independently. The desktop sidebar MUST support a collapsible icon-only state so operators can reclaim horizontal space without losing access to primary navigation.

#### Scenario: Desktop active state

Given the user is on /globals,
When the layout renders,
Then the sidebar highlights the localized Globals item and not the localized Agents item.

#### Scenario: Desktop sticky sidebar

Given the viewport width is large,
When the operator scrolls the main content area,
Then the desktop sidebar remains visible within the viewport,
And the main content area continues scrolling independently.

#### Scenario: Desktop collapses to icon rail

Given the viewport width is large,
When the operator collapses the sidebar,
Then the desktop shell renders an icon-only navigation rail,
And the operator can still activate the primary navigation items.

#### Scenario: Desktop collapsed state persists

Given the operator previously collapsed the desktop sidebar,
When the page reloads,
Then the desktop sidebar restores in the collapsed state.

#### Scenario: Mobile sheet sidebar

Given the viewport width is small,
When the user taps the hamburger button,
Then a sheet-based sidebar opens with the same localized navigation links.
