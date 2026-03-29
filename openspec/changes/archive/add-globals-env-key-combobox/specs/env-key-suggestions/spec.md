## MODIFIED Requirements

### Requirement: env-key-suggestion-categories

The `HERMES_ENV_KEY_GROUPS` array provides categorized environment variable key suggestions for the `EnvKeyCombobox` autocomplete component. Gateway platform keys must be organized by platform, and the same categorized suggestions must be available anywhere the web app uses `EnvKeyCombobox` for environment variable entry, including the Global Variables add form.

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

#### Scenario: Global variables form reuses categorized env key suggestions

**Given**: A user opens the `/globals` page add form
**When**: The user focuses the key field
**Then**: The key field uses `EnvKeyCombobox`
**And**: The user can browse categorized suggestions such as `LLM Provider` and `Tool API Keys`
**And**: The user can still choose a free-form key that is not part of the known suggestions
