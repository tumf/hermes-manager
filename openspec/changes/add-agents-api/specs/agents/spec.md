## ADDED Requirements

### Requirement: Agents REST API endpoints

Provide REST routes for managing agents.

- GET /api/agents — list agents (id, name, home, label, enabled, createdAt)
- POST /api/agents — create new agent with validated name, scaffold filesystem, insert DB row
- DELETE /api/agents?name=... — stop launchd, delete DB row, optional purge of filesystem with `?purge=true`
- POST /api/agents/copy — deep copy `{from}` to `{to}` and insert DB row

#### Scenario: List agents returns expected fields

Given the database contains agents rows
When a client requests GET /api/agents
Then the response is 200 and JSON array items contain id, name, home, label, enabled, createdAt

#### Scenario: Create agent with valid name

Given a JSON body {"name": "alpha_1"}
When a client posts to /api/agents
Then the server creates {PROJECT_ROOT}/agents/alpha_1 with AGENTS.md, SOUL.md, config.yaml, .env, logs/
And inserts a row into agents with label ai.hermes.gateway.alpha_1
And responds 201 with the created row payload

#### Scenario: Create agent with invalid name returns 400

Given a JSON body {"name": "bad name!"}
When a client posts to /api/agents
Then the server responds 400 and does not create directories or DB rows

#### Scenario: Delete agent without purge keeps filesystem

Given an existing agent named bravo and its DB row
When a client sends DELETE /api/agents?name=bravo
Then the server best-effort stops the launchd service
And removes the agents DB row for bravo
And leaves the filesystem at {PROJECT_ROOT}/agents/bravo intact

#### Scenario: Delete agent with purge removes filesystem

Given an existing agent named charlie and its DB row and directory
When a client sends DELETE /api/agents?name=charlie&purge=true
Then the server removes the DB row and recursively deletes {PROJECT_ROOT}/agents/charlie

#### Scenario: Copy agent creates new dir and DB row

Given an existing agent named delta with a populated directory
When a client posts to /api/agents/copy with {"from":"delta","to":"echo"}
Then the server deep-copies the delta directory to echo
And inserts a DB row for echo with label ai.hermes.gateway.echo
And responds 201 with the created row payload
