## MODIFIED Requirements

### Requirement: env-key-suggestion-categories

The `HERMES_ENV_KEY_GROUPS` array provides categorized environment variable key suggestions for the `EnvKeyCombobox` autocomplete component. Gateway platform keys must be organized by platform.

#### Scenario: Telegram keys are suggested

**Given**: A user is adding an environment variable via the EnvKeyCombobox
**When**: The user types "TELEGRAM"
**Then**: The combobox shows suggestions including `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALLOWED_USERS`, `TELEGRAM_HOME_CHANNEL`, and other Telegram-specific keys from the `Gateway: Telegram` category

#### Scenario: Discord keys are suggested

**Given**: A user is adding an environment variable via the EnvKeyCombobox
**When**: The user types "DISCORD"
**Then**: The combobox shows suggestions including `DISCORD_BOT_TOKEN`, `DISCORD_ALLOWED_USERS`, `DISCORD_HOME_CHANNEL`, and other Discord-specific keys from the `Gateway: Discord` category

#### Scenario: Existing gateway keys remain available

**Given**: A user is adding an environment variable via the EnvKeyCombobox
**When**: The user types "SLACK" or "EMAIL" or "WHATSAPP"
**Then**: The combobox shows the existing Slack, Email, and WhatsApp keys from the `Gateway: General` category
