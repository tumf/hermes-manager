---
change_type: implementation
priority: medium
dependencies: []
references:
  - app/api/agents/copy/route.ts
  - src/lib/dotenv-parser.ts
  - src/lib/env-meta.ts
---

# Sanitize Platform Token Values on Agent Copy

**Change Type**: implementation

## Problem / Context

Agent Copy (`POST /api/agents/copy`) uses `fs.cp()` to duplicate the entire agent directory, including `.env`. This means platform bot tokens (Discord, Telegram, Slack, etc.) are copied verbatim. If both the source and copied agents start their gateways, the same token is used by two concurrent processes, causing message routing conflicts and disconnections.

Hermes Agent v0.6.0 introduced "Token Lock" in its Profile system to prevent this exact problem. Our webapp should adopt the same principle: platform tokens must not be shared across agents.

## Proposed Solution

After `fs.cp()`, read the copied agent's `.env`, identify platform token keys from a well-known list, and clear their values (set to empty string) while keeping the key present. This preserves the "this agent needs this key configured" intent without risking token collision.

The well-known token key list:

- `TELEGRAM_BOT_TOKEN`
- `DISCORD_BOT_TOKEN`
- `SLACK_APP_TOKEN`
- `SLACK_BOT_TOKEN`
- `WHATSAPP_API_TOKEN`
- `SIGNAL_PHONE_NUMBER`
- `MATRIX_ACCESS_TOKEN`

The list is defined as a shared constant (`PLATFORM_TOKEN_KEYS`) in `src/lib/constants.ts` so it can be reused (e.g., future validation at gateway start).

## Acceptance Criteria

1. After agent copy, the new agent's `.env` retains all keys from the source
2. Platform token keys have their values set to empty string (`KEY=`)
3. Non-token keys are copied as-is
4. `.env.meta.json` is copied unchanged (visibility metadata preserved)
5. The constant list is exported and reusable

## Out of Scope

- Runtime token-lock enforcement (locking at gateway start time)
- UI warning when duplicate tokens are detected across agents
- Export/Import feature
