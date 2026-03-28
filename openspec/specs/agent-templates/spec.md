## Requirements

### Requirement: template CRUD

Named templates can be created, read, updated, and deleted for each of the three agent file types.

#### Scenario: create a template

**Given**: No template named "telegram-bot" exists for fileType "config.yaml"
**When**: `POST /api/templates` is called with `{ "fileType": "config.yaml", "name": "telegram-bot", "content": "name: ...\ngateway:\n  telegram: true\n" }`
**Then**: The template is created and returned with its id

#### Scenario: list templates by fileType

**Given**: Templates "default" and "telegram-bot" exist for fileType "config.yaml"
**When**: `GET /api/templates?fileType=config.yaml` is called
**Then**: Both templates are returned

#### Scenario: update a template

**Given**: A template "default" exists for fileType "agents.md"
**When**: `PUT /api/templates` is called with `{ "fileType": "agents.md", "name": "default", "content": "# Updated default\n" }`
**Then**: The template content is updated

#### Scenario: delete a template

**Given**: A template "old-template" exists for fileType "soul.md"
**When**: `DELETE /api/templates?fileType=soul.md&name=old-template` is called
**Then**: The template is deleted

#### Scenario: unique constraint on fileType + name

**Given**: A template "default" exists for fileType "agents.md"
**When**: `POST /api/templates` is called with `{ "fileType": "agents.md", "name": "default", "content": "..." }`
**Then**: A 409 conflict error is returned

### Requirement: template selection during agent creation

When creating an agent, the user selects templates for AGENTS.md, SOUL.md, and config.yaml.

#### Scenario: create agent with selected templates

**Given**: Templates "telegram-bot" exist for all three fileTypes
**When**: `POST /api/agents` is called with `{ "templates": { "agentsMd": "telegram-bot", "soulMd": "telegram-bot", "configYaml": "telegram-bot" } }`
**Then**: The new agent's files are scaffolded with the content from the "telegram-bot" templates

#### Scenario: create agent with default templates

**Given**: Templates named "default" exist for all three fileTypes
**When**: `POST /api/agents` is called with no `templates` field
**Then**: The new agent's files are scaffolded with the content from the "default" templates

#### Scenario: fallback when default template does not exist

**Given**: No template named "default" exists for fileType "agents.md"
**When**: `POST /api/agents` is called without specifying an agents.md template
**Then**: The agent's AGENTS.md is scaffolded with the current fixed content (`# {id}\n`)

### Requirement: add agent dialog with template selection

The "Add Agent" button opens a dialog where the user selects templates.

#### Scenario: open add agent dialog

**Given**: The user is on the Agents list page
**When**: The user clicks "Add Agent"
**Then**: A dialog appears with three dropdown selects (AGENTS.md, SOUL.md, config.yaml), each pre-selected to "default"

#### Scenario: create agent from dialog

**Given**: The add agent dialog is open with templates selected
**When**: The user clicks "Create"
**Then**: A new agent is created using the selected templates, the dialog closes, and the agent list refreshes

### Requirement: save as template

Users can save an existing agent's file content as a named template.

#### Scenario: save current file as template

**Given**: The user is viewing agent "x9k2m7p"'s Memory tab with AGENTS.md open
**When**: The user clicks "Save as Template" and enters the name "my-template"
**Then**: A new template is created with fileType "agents.md", name "my-template", and the current file content

## Requirements

### Requirement: agent creation file scaffolding

Agent file scaffolding now uses templates instead of fixed content.

#### Scenario: scaffold files from templates

**Given**: A new agent is being created
**When**: Template names are provided (or defaulted to "default")
**Then**: The agent's AGENTS.md, SOUL.md, and config.yaml are populated from the corresponding template content instead of fixed strings
