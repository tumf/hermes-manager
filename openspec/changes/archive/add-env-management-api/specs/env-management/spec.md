## ADDED Requirements

### Requirement: per-agent .env variable management API

Provide server-side endpoints to read, write, and delete environment variable entries in an agent's .env file, with masking support and a resolved merged view.

- Endpoints:
  - GET /api/env?agent=... — masked variable list
  - GET /api/env?agent=...&reveal=true — unmasked variable list
  - POST /api/env — upsert a variable
  - DELETE /api/env?agent=...&key=... — delete a variable
  - GET /api/env/resolved?agent=... — merged global+agent view
- .env format: KEY=VALUE lines; comments stripped on write
- Source annotation: 'global' | 'agent' | 'agent-override'

#### Scenario: read masked variables

Given an agent "alpha" whose .env contains API_KEY=secret
When GET /api/env?agent=alpha is called
Then the server responds 200 with [ { key: "API_KEY", value: "***", masked: true } ]

#### Scenario: read unmasked variables

Given an agent "alpha" whose .env contains API_KEY=secret
When GET /api/env?agent=alpha&reveal=true is called
Then the server responds 200 with [ { key: "API_KEY", value: "secret", masked: false } ]

#### Scenario: upsert a variable

When POST /api/env is called with body { agent: "alpha", key: "NEW_VAR", value: "hello" }
Then the server adds or updates NEW_VAR=hello in the agent's .env file
And responds with { ok: true }

#### Scenario: delete a variable

Given an agent "alpha" whose .env contains REMOVE_ME=yes
When DELETE /api/env?agent=alpha&key=REMOVE_ME is called
Then the server removes the REMOVE_ME line from the .env file
And responds with { ok: true }

#### Scenario: resolved merged view

Given a global .env with BASE_URL=https://example.com and an agent "alpha" .env with API_KEY=secret and BASE_URL=https://override.example.com
When GET /api/env/resolved?agent=alpha is called
Then the server responds with:

- { key: "BASE_URL", value: "https://override.example.com", source: "agent-override" }
- { key: "API_KEY", value: "secret", source: "agent" }
