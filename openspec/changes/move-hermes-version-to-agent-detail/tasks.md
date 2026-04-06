## Implementation Tasks

- [x] Update proposal-aligned product docs so the documented UI places Hermes version on the agent detail page instead of the agents list (verification: manual - confirm `docs/requirements.md` and `docs/design.md` describe list-without-Hermes and detail-with-Hermes behavior)

- [x] Modify agents list UI to remove Hermes version from desktop table and mobile cards without affecting other operational fields (verification: unit - update `tests/ui/agents-page.test.tsx` assertions so Hermes is absent from the list while Memory and status remain)

- [x] Modify agent detail UI to show Hermes version in the header info area with `--` fallback when unavailable (verification: unit - add or update component/page tests covering detail-page Hermes rendering and fallback behavior)

- [x] Update OpenSpec deltas and validate the proposal strictly (verification: manual - run `python3 /Users/tumf/.agents/skills/cflx-proposal/scripts/cflx.py validate move-hermes-version-to-agent-detail --strict`)

## Future Work

- 実装着手時に `npm run test`, `npm run typecheck`, `npm run lint` を通し、一覧と詳細の UI 回帰がないことを確認する
