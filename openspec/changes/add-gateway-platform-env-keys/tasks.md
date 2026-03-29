## Implementation Tasks

- [ ] Task 1: Rename existing `Gateway` category to `Gateway: General` in `src/lib/hermes-env-keys.ts` (verification: `grep 'Gateway: General' src/lib/hermes-env-keys.ts`)
- [ ] Task 2: Add `Gateway: Telegram` group with 9 keys to `HERMES_ENV_KEY_GROUPS` in `src/lib/hermes-env-keys.ts` (verification: `grep TELEGRAM_BOT_TOKEN src/lib/hermes-env-keys.ts`)
- [ ] Task 3: Add `Gateway: Discord` group with 9 keys to `HERMES_ENV_KEY_GROUPS` in `src/lib/hermes-env-keys.ts` (verification: `grep DISCORD_BOT_TOKEN src/lib/hermes-env-keys.ts`)
- [ ] Task 4: Update `tests/ui/env-key-combobox.test.tsx` to verify Telegram/Discord keys appear in suggestions (verification: `npm run test -- tests/ui/env-key-combobox.test.tsx`)
- [ ] Task 5: Run full validation (`npm run test && npm run typecheck && npm run lint`)
