## Requirements

### Requirement: template CRUD

Named templates can be created, read, updated, and deleted for each app-managed agent file type: `SOUL.md`, `memories/MEMORY.md`, `memories/USER.md`, and `config.yaml`.

#### Scenario: create a template

**Given**: No template named "telegram-bot" exists for file `config.yaml`
**When**: `POST /api/templates` is called with `{ "file": "config.yaml", "name": "telegram-bot", "content": "name: ...\ngateway:\n  telegram: true\n" }`
**Then**: The template file is created and returned

#### Scenario: list templates

**Given**: Templates "default" and "telegram-bot" exist
**When**: `GET /api/templates` is called
**Then**: Both template directories are returned with their `files` arrays

#### Scenario: update a template

**Given**: A template file `default/MEMORY.md` exists
**When**: `PUT /api/templates` is called with `{ "file": "memories/MEMORY.md", "name": "default", "content": "# Updated default\n" }`
**Then**: The template content is updated

#### Scenario: delete a template file

**Given**: A template file `old-template/SOUL.md` exists
**When**: `DELETE /api/templates?name=old-template&file=SOUL.md` is called
**Then**: The template file is deleted

#### Scenario: unique constraint on template file path

**Given**: A template file `default/MEMORY.md` exists
**When**: `POST /api/templates` is called with `{ "file": "memories/MEMORY.md", "name": "default", "content": "..." }`
**Then**: A 409 conflict error is returned

### Requirement: template selection during agent creation

When creating an agent, the user selects templates for `SOUL.md`, `memories/MEMORY.md`, `memories/USER.md`, and `config.yaml`.

#### Scenario: create agent with selected templates

**Given**: Templates "telegram-bot" exist for all four app-managed files
**When**: `POST /api/agents` is called with `{ "templates": { "memoryMd": "telegram-bot", "userMd": "telegram-bot", "soulMd": "telegram-bot", "configYaml": "telegram-bot" } }`
**Then**: The new agent's files are scaffolded with the content from the "telegram-bot" templates

#### Scenario: create agent with default templates

**Given**: Templates named "default" exist for all app-managed files
**When**: `POST /api/agents` is called with no `templates` field
**Then**: The new agent's files are scaffolded with the content from the "default" templates

#### Scenario: fallback when default template does not exist

**Given**: No template named "default" exists for file `memories/MEMORY.md`
**When**: `POST /api/agents` is called without specifying a `memoryMd` template
**Then**: The agent's `memories/MEMORY.md` is scaffolded with fallback content

### Requirement: add agent dialog with template selection

The "Add Agent" button opens a dialog where the user selects templates.

#### Scenario: open add agent dialog

**Given**: The user is on the Agents list page
**When**: The user clicks "Add Agent"
**Then**: A dialog appears with four dropdown selects (`memories/MEMORY.md`, `memories/USER.md`, `SOUL.md`, `config.yaml`), each pre-selected to "default"

#### Scenario: create agent from dialog

**Given**: The add agent dialog is open with templates selected
**When**: The user clicks "Create"
**Then**: A new agent is created using the selected templates, the dialog closes, and the agent list refreshes

### Requirement: save as template

Users can save an existing agent's file content as a named template.

#### Scenario: save current file as template

**Given**: The user is viewing agent "x9k2m7p"'s Memory tab with `memories/MEMORY.md` open
**When**: The user clicks "Save as Template" and enters the name "my-template"
**Then**: A new template file is created with `file="memories/MEMORY.md"`, `name="my-template"`, and the current file content

### Requirement: agent creation file scaffolding

Agent file scaffolding now uses templates instead of fixed content.

#### Scenario: scaffold files from templates

**Given**: A new agent is being created
**When**: Template names are provided (or defaulted to "default")
**Then**: The agent's `memories/MEMORY.md`, `memories/USER.md`, `SOUL.md`, and `config.yaml` are populated from the corresponding template content instead of fixed strings
**And**: `AGENTS.md` is not part of the template-driven scaffold surface

## CHANGED Requirements

### Requirement: templates list page display axis

The Templates page groups templates by file type (`memories/MEMORY.md`, `memories/USER.md`, `SOUL.md`, `config.yaml`) instead of by template name.

#### Scenario: templates page shows file-type cards

**Given**: Templates "default" and "research" exist, each containing `memories/MEMORY.md` and `config.yaml`
**When**: The user navigates to the /templates page
**Then**: Two cards are displayed: `memories/MEMORY.md` (listing "default", "research") and `config.yaml` (listing "default", "research")

#### Scenario: cards are expanded by default

**Given**: Templates exist for multiple file types
**When**: The /templates page loads
**Then**: All file-type cards are expanded (showing their template name lists)

#### Scenario: file-type card hidden when no templates

**Given**: No templates contain a `SOUL.md` file
**When**: The /templates page loads
**Then**: No `SOUL.md` card is displayed

#### Scenario: template names sorted alphabetically within card

**Given**: Templates "develop", "default", and "research" all contain `memories/MEMORY.md`
**When**: The `memories/MEMORY.md` card is displayed
**Then**: The template names are listed in order: "default", "develop", "research"

#### Scenario: edit a template file from file-type card

**Given**: The `memories/MEMORY.md` card lists template "research"
**When**: The user clicks the edit button on the "research" row
**Then**: The edit dialog opens with the content of `templates/research/MEMORY.md`

#### Scenario: delete a template file from file-type card

**Given**: The `config.yaml` card lists template "default"
**When**: The user clicks the delete button on the "default" row and confirms
**Then**: The file `templates/default/config.yaml` is deleted and the card refreshes

### Requirement: template-level bulk delete from list page

The "Delete template" button (which deleted all files in a template directory at once) is removed from the Templates list page. Individual file deletion remains available.

### Requirement: template CRUD

Named templates can be created, read, updated, and deleted for each app-managed agent file type: `SOUL.md`, `memories/MEMORY.md`, `memories/USER.md`, and `config.yaml`.

#### Scenario: create a template

**Given**: No template named `telegram-bot` exists for file `config.yaml`
**When**: `POST /api/templates` is called with `{ "file": "config.yaml", "name": "telegram-bot", "content": "name: ...\ngateway:\n  telegram: true\n" }`
**Then**: The template is created and returned with its id

#### Scenario: update a template

**Given**: A template `default` exists for file `memories/MEMORY.md`
**When**: `PUT /api/templates` is called with `{ "file": "memories/MEMORY.md", "name": "default", "content": "# Updated default\n" }`
**Then**: The template content is updated

#### Scenario: delete a template

**Given**: A template `old-template` exists for file `memories/USER.md`
**When**: `DELETE /api/templates?name=old-template&file=USER.md` is called
**Then**: The template is deleted

#### Scenario: unique constraint on file plus name

**Given**: A template `default` exists for file `memories/MEMORY.md`
**When**: `POST /api/templates` is called with `{ "file": "memories/MEMORY.md", "name": "default", "content": "..." }`
**Then**: A 409 conflict error is returned

### Requirement: template selection during agent creation

When creating an agent, the user selects templates for `SOUL.md`, `memories/MEMORY.md`, `memories/USER.md`, and `config.yaml`.

#### Scenario: create agent with selected templates

**Given**: Templates `telegram-bot` exist for all four files
**When**: `POST /api/agents` is called with `{ "templates": { "memoryMd": "telegram-bot", "userMd": "telegram-bot", "soulMd": "telegram-bot", "configYaml": "telegram-bot" } }`
**Then**: The new agent's files are scaffolded with the content from the `telegram-bot` templates

#### Scenario: fallback when default template does not exist

**Given**: No template named `default` exists for file `memories/MEMORY.md`
**When**: `POST /api/agents` is called without specifying a `memoryMd` template
**Then**: The agent's `memories/MEMORY.md` is scaffolded from the web app's built-in fallback content

### Requirement: add agent dialog with template selection

The `Add Agent` dialog lets the user select templates for all app-managed files scaffolded at creation time.

#### Scenario: open add agent dialog

**Given**: The user is on the Agents list page
**When**: The user clicks `Add Agent`
**Then**: A dialog appears with four dropdown selects (`memories/MEMORY.md`, `memories/USER.md`, `SOUL.md`, `config.yaml`), each pre-selected to `default`

### Requirement: save as template

Users can save an existing agent's current file content as a named template for the currently open app-managed file.

#### Scenario: save current file as template

**Given**: The user is viewing agent `x9k2m7p`'s Memory tab with `memories/USER.md` open
**When**: The user clicks `Save as Template` and enters the name `my-template`
**Then**: A new template is created with `file="memories/USER.md"`, `name="my-template"`, and the current file content

### Requirement: agent creation file scaffolding

Agent file scaffolding uses templates or built-in fallback content for the app-managed file set.

#### Scenario: scaffold files from templates

**Given**: A new agent is being created
**When**: Template names are provided (or defaulted to `default`)
**Then**: The agent's `memories/MEMORY.md`, `memories/USER.md`, `SOUL.md`, and `config.yaml` are populated from the corresponding template content or fallback content
**And**: `AGENTS.md` is not part of the template-driven scaffold surface

### Requirement: template CRUD

Named templates can be created, read, updated, and deleted for each app-managed agent file type: `SOUL.md`, `memories/MEMORY.md`, `memories/USER.md`, and `config.yaml`.

#### Scenario: create a template

**Given**: No template named `telegram-bot` exists for file `config.yaml`
**When**: `POST /api/templates` is called with `{ "file": "config.yaml", "name": "telegram-bot", "content": "name: ...\ngateway:\n  telegram: true\n" }`
**Then**: The template is created and returned with its id

#### Scenario: update a template

**Given**: A template `default` exists for file `memories/MEMORY.md`
**When**: `PUT /api/templates` is called with `{ "file": "memories/MEMORY.md", "name": "default", "content": "# Updated default\n" }`
**Then**: The template content is updated

#### Scenario: delete a template

**Given**: A template `old-template` exists for file `memories/USER.md`
**When**: `DELETE /api/templates?name=old-template&file=memories/USER.md` is called
**Then**: The template is deleted

#### Scenario: unique constraint on file plus name

**Given**: A template `default` exists for file `memories/MEMORY.md`
**When**: `POST /api/templates` is called with `{ "file": "memories/MEMORY.md", "name": "default", "content": "..." }`
**Then**: A 409 conflict error is returned

### Requirement: template selection during agent creation

When creating an agent, the user selects templates for `SOUL.md`, `memories/MEMORY.md`, `memories/USER.md`, and `config.yaml`.

#### Scenario: create agent with selected templates

**Given**: Templates `telegram-bot` exist for all four files
**When**: `POST /api/agents` is called with `{ "templates": { "soulMd": "telegram-bot", "memoryMd": "telegram-bot", "userMd": "telegram-bot", "configYaml": "telegram-bot" } }`
**Then**: The new agent's files are scaffolded with the content from the `telegram-bot` templates

#### Scenario: fallback when default template does not exist

**Given**: No template named `default` exists for file `memories/MEMORY.md`
**When**: `POST /api/agents` is called without specifying a `memoryMd` template
**Then**: The agent's `memories/MEMORY.md` is scaffolded from the web app's built-in fallback content

### Requirement: add agent dialog with template selection

The `Add Agent` dialog lets the user select templates for all app-managed files scaffolded at creation time.

#### Scenario: open add agent dialog

**Given**: The user is on the Agents list page
**When**: The user clicks `Add Agent`
**Then**: A dialog appears with four dropdown selects (`SOUL.md`, `MEMORY.md`, `USER.md`, `config.yaml`), each pre-selected to `default`

### Requirement: save as template

Users can save an existing agent's current file content as a named template for the currently open app-managed file.

#### Scenario: save current file as template

**Given**: The user is viewing agent `x9k2m7p`'s Memory tab with `memories/USER.md` open
**When**: The user clicks `Save as Template` and enters the name `my-template`
**Then**: A new template is created with `file="memories/USER.md"`, `name="my-template"`, and the current file content

### Requirement: agent creation file scaffolding

Agent file scaffolding uses templates or built-in fallback content for the app-managed file set.

#### Scenario: scaffold files from templates

**Given**: A new agent is being created
**When**: Template names are provided (or defaulted to `default`)
**Then**: The agent's `SOUL.md`, `memories/MEMORY.md`, `memories/USER.md`, and `config.yaml` are populated from the corresponding template content or fallback content
**And**: `AGENTS.md` is not part of the template-driven scaffold surface


### Requirement: template CRUD

Named templates can be created, read, updated, and deleted for each app-managed agent file type: `SOUL.md`, `memories/MEMORY.md`, `memories/USER.md`, and `config.yaml`. `config.yaml` templates MAY include Hermes MCP configuration such as `mcp_servers`.

#### Scenario: create a config template with MCP settings

**Given** no template named `mcp-enabled` exists for file `config.yaml`
**When** `POST /api/templates` is called with `mcp_servers` in the YAML content
**Then** the template file is created successfully
**And** the MCP settings are preserved in the stored YAML