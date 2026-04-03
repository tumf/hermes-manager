## Requirements

### Requirement: Agents REST API endpoints

Provide REST routes for managing agents through filesystem-backed runtime directories.

- GET /api/agents — list agents (agentId, name, description, tags, home, label, enabled, createdAt)
- POST /api/agents — create a new agent with an auto-generated ID, scaffold filesystem files, and return the created agent
- DELETE /api/agents?id=... — unload launchd for the agent; with `?purge=true` also delete the agent home directory
- POST /api/agents/copy — deep copy `{from}` to a newly generated agent ID and return the copied agent

#### Scenario: list agents returns expected fields

Given runtime agent directories exist
When a client requests GET /api/agents
Then the response is 200 and JSON array items contain agentId, name, description, tags, home, label, enabled, createdAt

#### Scenario: create agent generates runtime scaffold

Given a JSON body with optional templates/meta fields
When a client posts to /api/agents
Then the server generates a unique agent ID
And creates `{PROJECT_ROOT}/runtime/agents/<agentId>` with SOUL.md, memories/MEMORY.md, memories/USER.md, config.yaml, .env, and logs/
And responds 201 with the created agent payload

#### Scenario: create agent tolerates empty body

Given an empty or invalid JSON body
When a client posts to /api/agents
Then the server still creates a new agent using default templates
And responds 201 with the created agent payload

#### Scenario: delete agent without purge keeps filesystem

Given an existing agent ID and its runtime directory
When a client sends DELETE /api/agents?id=<agentId>
Then the server best-effort unloads the launchd service `ai.hermes.gateway.<agentId>`
And leaves `{PROJECT_ROOT}/runtime/agents/<agentId>` intact
And responds with { ok: true }

#### Scenario: delete agent with purge removes filesystem

Given an existing agent ID and its runtime directory
When a client sends DELETE /api/agents?id=<agentId>&purge=true
Then the server recursively deletes `{PROJECT_ROOT}/runtime/agents/<agentId>`
And responds with { ok: true }

#### Scenario: copy agent creates new dir with generated id

Given an existing agent named delta with a populated directory
When a client posts to /api/agents/copy with {"from":"delta"}
Then the server deep-copies the delta directory to `{PROJECT_ROOT}/runtime/agents/<newAgentId>`
And responds 201 with the copied agent payload
