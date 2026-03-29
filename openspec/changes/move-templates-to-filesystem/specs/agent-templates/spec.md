## MODIFIED Requirements

### Requirement: template storage

Templates are stored as files under `runtime/templates/{templateName}/` instead of the database.

#### Scenario: default templates auto-provisioned on startup

**Given**: `runtime/templates/default/` does not exist or is missing one or more files
**When**: The application initializes (ensureRuntimeDirectories or first templates API access)
**Then**: Missing files (`AGENTS.md`, `SOUL.md`, `config.yaml`) are created with hardcoded default content; existing files are not overwritten

#### Scenario: list all templates

**Given**: `runtime/templates/` contains directories `default/` and `telegram-bot/`
**When**: `GET /api/templates` is called
**Then**: Returns `[{ "name": "default", "files": ["AGENTS.md", "SOUL.md", "config.yaml"] }, { "name": "telegram-bot", "files": ["AGENTS.md", "config.yaml"] }]`

#### Scenario: get a specific template file

**Given**: `runtime/templates/default/AGENTS.md` exists with content "# Agent Instructions\n..."
**When**: `GET /api/templates?name=default&file=AGENTS.md` is called
**Then**: Returns `{ "name": "default", "file": "AGENTS.md", "content": "# Agent Instructions\n..." }`

### Requirement: template CRUD

Named templates can be created, read, updated, and deleted via the filesystem.

#### Scenario: create a template file

**Given**: No directory `runtime/templates/telegram-bot/` exists
**When**: `POST /api/templates` is called with `{ "name": "telegram-bot", "file": "config.yaml", "content": "name: bot\n" }`
**Then**: `runtime/templates/telegram-bot/config.yaml` is created and the file content is returned

#### Scenario: update a template file

**Given**: `runtime/templates/default/AGENTS.md` exists
**When**: `PUT /api/templates` is called with `{ "name": "default", "file": "AGENTS.md", "content": "# Updated\n" }`
**Then**: The file is overwritten with new content

#### Scenario: delete a single template file

**Given**: `runtime/templates/telegram-bot/config.yaml` exists
**When**: `DELETE /api/templates?name=telegram-bot&file=config.yaml` is called
**Then**: The file is deleted; the directory remains if other files exist

#### Scenario: delete an entire template

**Given**: `runtime/templates/old-template/` exists with files
**When**: `DELETE /api/templates?name=old-template` is called (no `file` param)
**Then**: The entire directory is deleted

#### Scenario: path traversal prevention

**Given**: Any API call with name or file containing `..` or `/`
**When**: The request is processed
**Then**: A 400 error is returned

### Requirement: template selection during agent creation

When creating an agent, templates are resolved from the filesystem.

#### Scenario: create agent with selected templates

**Given**: `runtime/templates/telegram-bot/` contains all three files
**When**: `POST /api/agents` is called with `{ "templates": { "agentsMd": "telegram-bot", "soulMd": "telegram-bot", "configYaml": "telegram-bot" } }`
**Then**: The new agent's files are scaffolded with content from `runtime/templates/telegram-bot/`

#### Scenario: create agent with default templates

**Given**: `runtime/templates/default/` contains all three files
**When**: `POST /api/agents` is called with no `templates` field
**Then**: The new agent's files are scaffolded with content from `runtime/templates/default/`

#### Scenario: fallback when template file does not exist

**Given**: `runtime/templates/default/AGENTS.md` does not exist
**When**: An agent is created without specifying an AGENTS.md template
**Then**: The agent's AGENTS.md is scaffolded with hardcoded fallback content (`# {id}\n`)

## REMOVED Requirements

### Requirement: database templates table

The `templates` SQLite table is no longer used. Template data is stored entirely on the filesystem under `runtime/templates/`.
