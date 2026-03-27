## ADDED Requirements

### Requirement: Global env vars REST API

Expose CRUD operations for global-scoped environment variables stored in the env_vars
table and maintain a dotenvx-compatible file on disk.

- GET /api/globals — list all env_vars where scope='global'
- POST /api/globals — upsert {key, value} at scope='global'; regenerate globals/.env
- DELETE /api/globals?key=... — delete matching row; regenerate globals/.env

#### Scenario: List returns only global scope vars

Given env_vars contains rows with scope='global' and scope='agent-foo'
When a client requests GET /api/globals
Then the response is 200 with only the rows where scope equals global

#### Scenario: Upsert creates a new global variable and regenerates file

Given no global variable FOO exists
When a client posts to /api/globals with {"key":"FOO","value":"bar"}
Then a new row with scope=global, key=FOO, value=bar is inserted
And globals/.env contains the line FOO=bar
And the response is 200 or 201 with the upserted row

#### Scenario: Upsert updates an existing global variable and regenerates file

Given a global variable FOO=old exists in env_vars
When a client posts to /api/globals with {"key":"FOO","value":"new"}
Then the row is updated with value=new
And globals/.env contains FOO=new and no longer contains FOO=old

#### Scenario: Delete removes global variable and regenerates file

Given a global variable BAZ=qux exists in env_vars
When a client sends DELETE /api/globals?key=BAZ
Then the row is removed from env_vars
And globals/.env no longer contains BAZ=qux
And the response is 200

#### Scenario: globals/.env is dotenvx-compatible KEY=VALUE format

Given one or more global env vars exist
When regenerateGlobalsEnv() is called
Then globals/.env is written with one KEY=VALUE line per variable
And the file has no extra blank lines between entries
