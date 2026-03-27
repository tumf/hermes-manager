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
