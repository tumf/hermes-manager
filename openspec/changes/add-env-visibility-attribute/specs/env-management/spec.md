## MODIFIED Requirements

### Requirement: per-agent .env variable management API

Provide server-side endpoints to read, write, and delete environment variable entries in an agent's .env configuration, with persisted `visibility` metadata, masking support for secure values, and a resolved merged runtime view.

- Endpoints:
  - GET /api/env?agent=... — management variable list with masking based on `visibility`
  - POST /api/env — upsert a variable and its `visibility`
  - DELETE /api/env?agent=...&key=... — delete a variable
  - GET /api/env/resolved?agent=... — merged global+agent runtime view
- Visibility values: `plain` | `secure`
- .env format: KEY=VALUE lines; comments stripped on write
- Source annotation: `global` | `agent` | `agent-override`
- Backward compatibility: existing variables are treated as `plain` when no persisted visibility exists yet

#### Scenario: read secure variables as masked values

Given an agent "alpha" whose API_KEY variable is marked `secure` with runtime value `secret`
When GET /api/env?agent=alpha is called
Then the server responds 200 with an entry including `{ key: "API_KEY", value: "***", masked: true, visibility: "secure" }`

#### Scenario: read plain variables as plaintext values

Given an agent "alpha" whose BASE_URL variable is marked `plain` with runtime value `https://example.com`
When GET /api/env?agent=alpha is called
Then the server responds 200 with an entry including `{ key: "BASE_URL", value: "https://example.com", masked: false, visibility: "plain" }`

#### Scenario: upsert persists visibility metadata

When POST /api/env is called with body `{ agent: "alpha", key: "NEW_VAR", value: "hello", visibility: "secure" }`
Then the server stores `NEW_VAR` with runtime value `hello` and visibility `secure`
And subsequent management reads return that variable masked with `visibility: "secure"`

#### Scenario: resolved merged view preserves runtime values

Given a global variable `BASE_URL=https://example.com` marked `plain`
And an agent "alpha" variable `API_KEY=secret` marked `secure`
When GET /api/env/resolved?agent=alpha is called
Then the server responds with runtime values including `{ key: "API_KEY", value: "secret", source: "agent" }`
And the response is not masked solely because the variable visibility is `secure`
