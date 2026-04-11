## Requirements

### Requirement: local service lifecycle management API

Implement a server-side API to manage local OS service supervisors associated with Hermes agents.

- Endpoint: POST /api/launchd (legacy path retained for compatibility)
- Request body: { agent: string, action: 'install'|'uninstall'|'start'|'stop'|'restart'|'status' }
- Execution: Use child_process.execFile for all system calls (no shell injection)
- Agent resolution: look up the agent in the filesystem-backed runtime model to obtain home and service label/unit name
- On macOS, the implementation uses launchctl, plist generation, and ~/Library/LaunchAgents
- On Linux, the implementation uses systemctl --user, systemd user-unit generation, and the per-user unit directory
- Agent service definitions on both platforms preserve HERMES_HOME, working directory, stdout/stderr log destinations, and optional API_SERVER_ENABLED / API_SERVER_PORT

#### Scenario: install action writes plist and bootstraps

Given an existing agent record with name "alpha", home "/Users/me/Hermes/alpha", and label "ai.hermes.gateway.alpha"
When POST /api/launchd is called with { agent: "alpha", action: "install" }
Then the server writes a plist file at ~/Library/LaunchAgents/ai.hermes.gateway.alpha.plist with the specified ProgramArguments and EnvironmentVariables
And runs launchctl bootstrap gui/{uid} ~/Library/LaunchAgents/ai.hermes.gateway.alpha.plist via execFile
And returns JSON including { code: 0 } on success

#### Scenario: uninstall action boots out and removes plist

Given an installed launch agent with label "ai.hermes.gateway.alpha" and an existing plist file
When POST /api/launchd is called with { agent: "alpha", action: "uninstall" }
Then the server invokes launchctl bootout gui/{uid}/ai.hermes.gateway.alpha via execFile
And removes the plist file at ~/Library/LaunchAgents/ai.hermes.gateway.alpha.plist
And returns JSON including { code: 0 } on success

#### Scenario: start and stop control the service

Given an installed launch agent with label "ai.hermes.gateway.alpha"
When POST /api/launchd is called with { agent: "alpha", action: "start" }
Then the server invokes launchctl start ai.hermes.gateway.alpha via execFile and returns { code: 0 }

When POST /api/launchd is called with { agent: "alpha", action: "stop" }
Then the server invokes launchctl stop ai.hermes.gateway.alpha via execFile and returns { code: 0 }

#### Scenario: status returns running boolean and output

Given an installed launch agent with label "ai.hermes.gateway.alpha"
When POST /api/launchd is called with { agent: "alpha", action: "status" }
Then the server invokes launchctl print gui/{uid}/ai.hermes.gateway.alpha via execFile
And parses the output for a line like "state = running" to produce { running: true }
And returns JSON including { running: boolean, output: string, stdout, stderr, code }
