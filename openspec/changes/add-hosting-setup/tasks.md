# Tasks — add-hosting-setup

## Implementation Tasks

- [x] Create scripts/migrate.ts that runs drizzle-kit push or executes inline
  CREATE TABLE IF NOT EXISTS statements for all schema tables so the SQLite DB is
  ready before the server starts
- [x] Create scripts/start-prod.sh that runs the migration then executes
  node server.js (or next start) with PORT=18470 and NODE_ENV=production
- [x] Add "start:prod": "bash scripts/start-prod.sh" to the scripts section of
  package.json
- [x] Create hosting/ai.hermes.agents-webapp.plist with the launchd service
  definition: Label, ProgramArguments, WorkingDirectory, EnvironmentVariables
  (PORT, NODE_ENV), StandardOutPath, StandardErrorPath, RunAtLoad, KeepAlive
- [x] Create hosting/caddy-snippet.conf with the Caddy reverse_proxy block for
  hermes-agents.mini.tumf.dev pointing to localhost:18470 including TLS via
  existing ACME config
- [x] Add instructions in hosting/README.md for installing the plist with
  launchctl bootstrap and adding the Caddy snippet to the existing Caddyfile
- [x] Create logs/ directory with a .gitkeep and ensure it is excluded from
  commits except the placeholder
- [x] Validate proposal with cflx validate add-hosting-setup --strict
