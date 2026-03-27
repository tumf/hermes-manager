# Hosting Setup Spec

## ADDED Requirements

### Requirement: launchd service keeps webapp running persistently

The project MUST include a launchd plist that starts the webapp automatically at
login and restarts it if it exits, using PORT=18470 and NODE_ENV=production.

#### Scenario: Service starts on login

Given the plist is installed via launchctl bootstrap,
When the user logs in,
Then the webapp process starts on port 18470 automatically.

#### Scenario: Log files written to correct paths

Given the plist is loaded and the webapp is running,
When the process writes to stdout or stderr,
Then output appears in logs/webapp.log and logs/webapp.error.log respectively.

### Requirement: Caddy snippet routes public subdomain

The project MUST include a Caddy configuration snippet that routes
hermes-agents.mini.tumf.dev to localhost:18470 with HTTPS termination.

#### Scenario: Public domain resolves to webapp

Given the snippet is included in the active Caddyfile and Caddy is reloaded,
When an HTTPS request is made to hermes-agents.mini.tumf.dev,
Then Caddy reverse proxies to localhost:18470.

### Requirement: Production start script runs migration then server

The npm run start:prod script MUST run DB migrations to create tables if they do
not exist, then start the Next.js server on PORT=18470.

#### Scenario: Fresh database is initialized on first start

Given no SQLite database file exists,
When npm run start:prod is executed,
Then the migration script creates all schema tables and the server starts without
error.

#### Scenario: Existing database is not reset

Given a database file with existing data already exists,
When npm run start:prod is executed,
Then the migration script leaves existing data intact and the server starts.
