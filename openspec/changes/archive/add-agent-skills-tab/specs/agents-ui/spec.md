## MODIFIED Requirements

### Requirement: Agent details page provides operational tabs

The agent details page (`/agents/[name]`) MUST provide tabs for `Memory`, `Config`, `Skills`, and `Logs` so operators can manage runtime behavior without leaving the page.

#### Scenario: Skills tab is visible with other operational tabs

Given a user opens `/agents/alpha`
When the page finishes rendering
Then the tab list includes `Memory`, `Config`, `Skills`, and `Logs`

### Requirement: Skills tab supports hierarchical equip management

The `Skills` tab MUST display the hierarchical skills catalog from `/api/skills/tree`, allow selecting only directories with `hasSkill=true`, and reflect current equipment state from `/api/skills/links?agent=...`.

#### Scenario: Category node is not directly selectable

Given a catalog node has `hasSkill=false`
When the user views that row in the Skills tab
Then no equip checkbox is shown for that node

#### Scenario: Equip action links selected skill

Given a node `openclaw-imports/refactor` has `hasSkill=true`
And it is not currently equipped
When the user checks the node in the Skills tab
Then the UI calls POST `/api/skills/links` with `{agent:"alpha", relativePath:"openclaw-imports/refactor"}`
And refreshes equipped state after success

#### Scenario: Stale equipped row is indicated

Given `/api/skills/links?agent=alpha` returns a row with `exists=false`
When the Skills tab renders
Then the UI marks that skill as stale or missing for operator awareness
