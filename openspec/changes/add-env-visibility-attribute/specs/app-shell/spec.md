## MODIFIED Requirements

### Requirement: Globals management UI

The `/globals` page MUST display and allow inline add/edit/delete of global env vars (scope="global"), allow operators to set `plain` or `secure` visibility for each variable, and show secure values as masked while keeping the generated `.env` preview semantically aligned with real runtime content.

#### Scenario: Add a secure global variable

When the user adds a key/value, selects `secure`, and saves
Then the table updates with that row shown as masked
And the row indicates `secure` visibility
And the `.env` preview reflects the saved runtime key/value content

#### Scenario: Edit visibility from plain to secure

Given an existing global variable is shown as plain text with `plain` visibility
When the user changes its visibility to `secure` and saves
Then subsequent table rendering masks the value
And the stored visibility is shown as `secure`

### Requirement: Agent detail page scaffold with tabs

The app MUST include app/agents/[name]/page.tsx rendering tabs: Memory, Config, Env, Skills, Logs, and the Env tab must support visibility-aware management for agent-local variables.

#### Scenario: Agent Env tab masks secure variables

Given a user navigates to `/agents/alice`
And the Env tab includes a variable marked `secure`
When the Env tab renders its variable list
Then that variable value is displayed as masked
And its visibility control shows `secure`
