# Add Hosting Setup

**Change Type**: implementation

## Summary

Configure the hermes-agents webapp for persistent hosting on the mini server:
a launchd service manages the Node.js process and Caddy proxies the public
subdomain. Includes a production start script and automatic DB migration on
startup.

## Motivation

The webapp currently requires manual start. Persistent hosting via launchd
ensures it survives reboots, and Caddy provides HTTPS termination via the
existing reverse proxy.

## Scope

- launchd plist ~/Library/LaunchAgents/ai.hermes.agents-webapp.plist that runs
  node server.js with PORT=18470 and NODE_ENV=production
- Caddy snippet for hermes-agents.mini.tumf.dev → localhost:18470 reverse proxy
- npm run start:prod script in package.json
- DB migration on startup: createTableIfNotExist for all schema tables so the
  production SQLite file is initialized automatically

## Technical Notes

- The plist sets WorkingDirectory to /Users/tumf/services/hermes-agents
- stdout/stderr redirected to logs/webapp.log and logs/webapp.error.log
- Migration runs inline at startup before the HTTP listener is opened to avoid
  race conditions
- Caddy snippet is additive to the existing Caddyfile; it can be included via
  import or appended manually
