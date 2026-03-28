## ADDED Requirements

### Requirement: env key name suggestion combobox

When adding a new environment variable in the agent Env tab, the key name input provides a searchable dropdown of known Hermes environment variable keys grouped by category.

#### Scenario: display key suggestions on focus

**Given**: The user opens the Env tab Add form for agent "alpha"
**When**: The user focuses or clicks the key name input field
**Then**: A dropdown appears showing Hermes-known key names grouped by category (e.g. "LLM Provider", "Tool API Keys", "Terminal")

#### Scenario: filter suggestions by partial input

**Given**: The key suggestion dropdown is open
**When**: The user types "OPEN" into the key name field
**Then**: Only keys containing "OPEN" are shown (e.g. OPENROUTER_API_KEY, OPENCODE_ZEN_API_KEY, OPENCODE_GO_API_KEY)

#### Scenario: select a suggestion

**Given**: The key suggestion dropdown shows filtered results
**When**: The user clicks on "OPENROUTER_API_KEY"
**Then**: The key name field is populated with "OPENROUTER_API_KEY" and the dropdown closes

#### Scenario: allow custom key name not in suggestions

**Given**: The key suggestion dropdown is open
**When**: The user types "MY_CUSTOM_KEY" which does not match any suggestion
**Then**: The form accepts "MY_CUSTOM_KEY" as a valid key name and allows submission
