# Add Gateway Platform Environment Variable Key Suggestions

## Problem / Context

`src/lib/hermes-env-keys.ts` defines the autocomplete suggestions for the `EnvKeyCombobox` component used when adding environment variables to agents. The current `Gateway` category only includes Slack, WhatsApp, Email, and general gateway keys.

**Telegram and Discord environment variable keys are completely missing**, despite being the two most commonly used Hermes gateway platforms. Users must manually type the full key name (e.g. `TELEGRAM_BOT_TOKEN`) without any autocomplete assistance.

## Proposed Solution

Expand `HERMES_ENV_KEY_GROUPS` in `src/lib/hermes-env-keys.ts`:

1. Split the existing `Gateway` category into `Gateway: General` (keeping Slack/WhatsApp/Email/common keys)
2. Add a new `Gateway: Telegram` category with 9 keys
3. Add a new `Gateway: Discord` category with 9 keys

All keys are sourced from the actual Hermes Agent gateway codebase (`gateway/run.py`, `tools/environments/local.py`, `cron/`).

### Keys to Add

**Gateway: Telegram**

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ALLOWED_USERS`
- `TELEGRAM_ALLOW_ALL_USERS`
- `TELEGRAM_HOME_CHANNEL`
- `TELEGRAM_HOME_CHANNEL_NAME`
- `TELEGRAM_REPLY_TO_MODE`
- `TELEGRAM_TOPIC_TARGET_RE`
- `TELEGRAM_TEXT_BATCH_DELAY_SECONDS`
- `TELEGRAM_MEDIA_BATCH_DELAY_SECONDS`

**Gateway: Discord**

- `DISCORD_BOT_TOKEN`
- `DISCORD_ALLOWED_USERS`
- `DISCORD_ALLOW_ALL_USERS`
- `DISCORD_HOME_CHANNEL`
- `DISCORD_HOME_CHANNEL_NAME`
- `DISCORD_REQUIRE_MENTION`
- `DISCORD_FREE_RESPONSE_CHANNELS`
- `DISCORD_AUTO_THREAD`
- `DISCORD_ALLOW_BOTS`

## Acceptance Criteria

- [ ] `EnvKeyCombobox` shows Telegram keys when user types "TELEGRAM"
- [ ] `EnvKeyCombobox` shows Discord keys when user types "DISCORD"
- [ ] Existing Gateway keys (Slack/WhatsApp/Email) remain available
- [ ] `ALL_HERMES_ENV_KEYS` flat list includes all new keys
- [ ] All existing tests pass (`npm run test`)
- [ ] Type check passes (`npm run typecheck`)

## Out of Scope

- Adding per-key descriptions or tooltips
- Validating key values against platform-specific formats
- Auto-detecting which platform an agent uses
