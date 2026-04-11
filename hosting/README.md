# Hosting Setup

Instructions for running the hermes-agents webapp persistently on macOS (launchd) or Linux (systemd), with optional Caddy reverse proxying.

## Prerequisites

- Node.js installed and accessible via PATH
- The repo cloned to the target host
- Dependencies installed (`./.wt/setup` or `npm install`)
- A production build created with `npm run build`
- Caddy running on the server (if domain-based access is needed)

## Production Start Command

The production entrypoint is:

```bash
npm run start:prod
```

This starts the Next.js server on `PORT=18470` using the existing filesystem-based `runtime/` layout.
It does not run database migrations.

## macOS — launchd

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

To reload an updated plist, prefer:

```bash
launchctl kickstart -kp gui/$(id -u)/ai.hermes.agents-webapp
```

To stop the service:

```bash
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/ai.hermes.agents-webapp.plist
```

### macOS log files

- stdout → `runtime/logs/webapp.log`
- stderr → `runtime/logs/webapp.error.log`

## Linux — systemd

The provided unit file uses `systemd --user` services, matching the per-user model used for agent management.

1. Edit `hosting/ai.hermes.agents-webapp.service` and update `WorkingDirectory` and log paths to match your repo location.

2. Copy the unit file:

   ```bash
   mkdir -p ~/.config/systemd/user
   cp hosting/ai.hermes.agents-webapp.service ~/.config/systemd/user/
   ```

3. Reload, enable, and start:

   ```bash
   systemctl --user daemon-reload
   systemctl --user enable ai.hermes.agents-webapp.service
   systemctl --user start ai.hermes.agents-webapp.service
   ```

4. Verify:

   ```bash
   systemctl --user status ai.hermes.agents-webapp.service
   ```

To stop the service:

```bash
systemctl --user stop ai.hermes.agents-webapp.service
```

To ensure the user service starts at boot (without requiring login):

```bash
loginctl enable-linger $(whoami)
```

### Linux log files

- stdout → `runtime/logs/webapp.log` (via `StandardOutput=append:`)
- stderr → `runtime/logs/webapp.error.log` (via `StandardError=append:`)
- journald also captures output: `journalctl --user -u ai.hermes.agents-webapp.service`

## Add the Caddy snippet

Append or import `hosting/caddy-snippet.conf` into the active Caddyfile:

```bash
# Option A: append directly
cat hosting/caddy-snippet.conf >> /etc/caddy/Caddyfile

# Option B: use an import directive in the Caddyfile
# Add this line to the Caddyfile:
#   import /path/to/hermes-agents/hosting/caddy-snippet.conf

caddy reload --config /etc/caddy/Caddyfile
```
