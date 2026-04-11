## MODIFIED Requirements

### Requirement: persistent local service hosting keeps webapp running

The project MUST include local-service hosting artifacts that keep the webapp running persistently on supported operating systems.

- On macOS, the repository must provide a launchd plist that starts the webapp automatically at login and restarts it if it exits, using `PORT=18470` and `NODE_ENV=production`.
- On Linux, the repository must provide a systemd service definition and installation instructions that start the webapp persistently with the same port and environment semantics.

#### Scenario: macos-hosting-service-starts-on-login

**Given**: the macOS launchd plist is installed via `launchctl bootstrap`
**When**: the user logs in
**Then**: the webapp process starts on port 18470 automatically

#### Scenario: linux-hosting-service-starts-via-systemd

**Given**: the Linux systemd unit is installed according to the repository instructions
**When**: the operator enables and starts the service
**Then**: the webapp process starts on port 18470 using `NODE_ENV=production`

#### Scenario: service-logs-are-documented-per-platform

**Given**: a supported hosting artifact is installed and the webapp is running
**When**: the process writes stdout or stderr
**Then**: the repository documentation identifies the corresponding log destinations for that platform
