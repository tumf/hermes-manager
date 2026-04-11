## MODIFIED Requirements

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
