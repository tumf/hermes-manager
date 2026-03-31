## MODIFIED Requirements

### Requirement: agent-copy-env-sanitization

When an agent is copied, platform-specific bot token values in the new agent's `.env` file must be cleared (set to empty string) to prevent token collision between concurrent gateway processes. The key names are retained so the user knows which tokens to configure.

#### Scenario: copy agent with platform tokens

**Given**: Source agent has `.env` with `TELEGRAM_BOT_TOKEN=abc123` and `OPENAI_API_KEY=sk-xxx`
**When**: `POST /api/agents/copy` is called with `{ "from": "<sourceAgentId>" }`
**Then**: The new agent's `.env` contains `TELEGRAM_BOT_TOKEN=` (empty value) and `OPENAI_API_KEY=sk-xxx` (unchanged)

#### Scenario: copy agent without platform tokens

**Given**: Source agent has `.env` with only `OPENAI_API_KEY=sk-xxx`
**When**: `POST /api/agents/copy` is called
**Then**: The new agent's `.env` contains `OPENAI_API_KEY=sk-xxx` unchanged

#### Scenario: copy agent with empty env file

**Given**: Source agent has an empty `.env` file
**When**: `POST /api/agents/copy` is called
**Then**: The new agent's `.env` is empty
