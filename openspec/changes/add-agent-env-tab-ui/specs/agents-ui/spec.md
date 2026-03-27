## MODIFIED Requirements

### Requirement: Agent detail tabs expose agent configuration workflows

The agent detail page MUST provide tabs for memory files, configuration, per-agent environment variables, and logs so operators can manage an agent without switching to unrelated pages.

#### Scenario: Env tab is available from agent detail page

Given an operator opens `/agents/alpha`
When the page renders the available tabs
Then the page includes an `Env` tab in addition to the existing agent detail tabs

#### Scenario: Env tab manages agent-local variables only

Given an operator opens the `Env` tab for agent `alpha`
When the page shows editable environment variable rows
Then the editable rows come from `alpha`'s `.env`
And global variables remain managed from the dedicated globals page
