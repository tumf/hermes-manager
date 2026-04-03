## MODIFIED Requirements

### Requirement: template CRUD

Named templates can be created, read, updated, and deleted for each app-managed agent file type: `MEMORY.md`, `USER.md`, `SOUL.md`, and `config.yaml`.

#### Scenario: create a template

**Given**: No template named `telegram-bot` exists for file `config.yaml`
**When**: `POST /api/templates` is called with `{ "file": "config.yaml", "name": "telegram-bot", "content": "name: ...\ngateway:\n  telegram: true\n" }`
**Then**: The template is created and returned with its id

#### Scenario: update a template

**Given**: A template `default` exists for file `MEMORY.md`
**When**: `PUT /api/templates` is called with `{ "file": "MEMORY.md", "name": "default", "content": "# Updated default\n" }`
**Then**: The template content is updated

#### Scenario: delete a template

**Given**: A template `old-template` exists for file `USER.md`
**When**: `DELETE /api/templates?name=old-template&file=USER.md` is called
**Then**: The template is deleted

#### Scenario: unique constraint on file plus name

**Given**: A template `default` exists for file `MEMORY.md`
**When**: `POST /api/templates` is called with `{ "file": "MEMORY.md", "name": "default", "content": "..." }`
**Then**: A 409 conflict error is returned

### Requirement: template selection during agent creation

When creating an agent, the user selects templates for `MEMORY.md`, `USER.md`, `SOUL.md`, and `config.yaml`.

#### Scenario: create agent with selected templates

**Given**: Templates `telegram-bot` exist for all four files
**When**: `POST /api/agents` is called with `{ "templates": { "memoryMd": "telegram-bot", "userMd": "telegram-bot", "soulMd": "telegram-bot", "configYaml": "telegram-bot" } }`
**Then**: The new agent's files are scaffolded with the content from the `telegram-bot` templates

#### Scenario: fallback when default template does not exist

**Given**: No template named `default` exists for file `MEMORY.md`
**When**: `POST /api/agents` is called without specifying a `memoryMd` template
**Then**: The agent's `MEMORY.md` is scaffolded from the web app's built-in fallback content

### Requirement: add agent dialog with template selection

The `Add Agent` dialog lets the user select templates for all app-managed files scaffolded at creation time.

#### Scenario: open add agent dialog

**Given**: The user is on the Agents list page
**When**: The user clicks `Add Agent`
**Then**: A dialog appears with four dropdown selects (`MEMORY.md`, `USER.md`, `SOUL.md`, `config.yaml`), each pre-selected to `default`

### Requirement: save as template

Users can save an existing agent's current file content as a named template for the currently open app-managed file.

#### Scenario: save current file as template

**Given**: The user is viewing agent `x9k2m7p`'s Memory tab with `USER.md` open
**When**: The user clicks `Save as Template` and enters the name `my-template`
**Then**: A new template is created with `file="USER.md"`, `name="my-template"`, and the current file content

### Requirement: agent creation file scaffolding

Agent file scaffolding uses templates or built-in fallback content for the app-managed file set.

#### Scenario: scaffold files from templates

**Given**: A new agent is being created
**When**: Template names are provided (or defaulted to `default`)
**Then**: The agent's `MEMORY.md`, `USER.md`, `SOUL.md`, and `config.yaml` are populated from the corresponding template content or fallback content
**And**: `AGENTS.md` is not part of the template-driven scaffold surface
