# Hosting Setup

Instructions for deploying the hermes-agents webapp on the mini server with launchd and Caddy.

## Prerequisites

- Node.js installed and accessible at `/usr/local/bin/node` (or via PATH)
- The repo cloned to `/Users/tumf/services/hermes-agents`
- Caddy running on the server

## Install the launchd service

1. Copy the plist to the LaunchAgents directory:

   ```bash
   cp hosting/ai.hermes.agents-webapp.plist ~/Library/LaunchAgents/
   ```

2. Bootstrap the service:

   ```bash
   launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/ai.hermes.agents-webapp.plist
   ```

3. Verify it is running:

   ```bash
   launchctl list | grep ai.hermes.agents-webapp
   ```

To stop the service:

```bash
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/ai.hermes.agents-webapp.plist
```

## Add the Caddy snippet

Append or import `hosting/caddy-snippet.conf` into the active Caddyfile:

```bash
# Option A: append directly
cat hosting/caddy-snippet.conf >> /etc/caddy/Caddyfile

# Option B: use an import directive in the Caddyfile
# Add this line to the Caddyfile:
#   import /Users/tumf/services/hermes-agents/hosting/caddy-snippet.conf

caddy reload --config /etc/caddy/Caddyfile
```

## Log files

- stdout → `logs/webapp.log`
- stderr → `logs/webapp.error.log`
