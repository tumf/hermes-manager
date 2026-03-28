## Implementation Tasks

- [x] Add `Skills` tab wiring to `app/agents/[name]/page.tsx` and render it alongside Memory/Config/Logs (verification: page source includes a `TabsTrigger` and `TabsContent` for `skills`).
- [x] Implement frontend skill tree state and fetch flows for `GET /api/skills/tree` and `GET /api/skills/links?agent=...` (verification: UI code issues both requests and maps responses to checked/equipped state).
- [x] Implement equip/unequip checkbox actions using `POST /api/skills/links` and `DELETE /api/skills/links?id=...` with optimistic disable and refresh (verification: action handlers in `app/agents/[name]/page.tsx` call both endpoints and reconcile state).
- [x] Update `src/lib/skills.ts` to provide `~/.agents/skills` root resolution and hierarchical equipable-node traversal (verification: helper functions return relative-path-aware nodes and detect `SKILL.md`).
- [x] Update `app/api/skills/tree/route.ts` response shape for hierarchical catalog usage and include root metadata (verification: route returns tree nodes with relative-path context and equipable marker).
- [x] Update `app/api/skills/links/route.ts` POST contract to `{agent, relativePath}` and create target symlink at `{agent.home}/skills/{relativePath}` with collision checks (verification: route code computes nested target paths and rejects conflicting existing targets).
- [x] Update `app/api/skills/links/route.ts` GET mapping to expose relative paths and legacy-source compatibility (`~/.hermes/skills` and `~/.agents/skills`) with `exists` status (verification: response mapping derives relative path and stale status from DB/filesystem).
- [x] Add/update API tests in `tests/api/skills.test.ts` for hierarchical listing, relative-path link creation, basename-collision safety, and stale-link reporting (verification: new/updated test cases exist and pass under `npm run test`).
- [x] Update `docs/requirements.md` and `docs/design.md` to reflect `~/.agents/skills` scanning, hierarchical links, and Skills tab behavior (verification: docs explicitly reference new root and preserved relative target paths).
- [x] Run project checks: `npm run test`, `npm run typecheck`, `npm run lint` (verification: commands complete successfully).

## Future Work

- Add explicit stale-link repair actions (re-link to canonical source or remove) if operators request one-click remediation.
- Consider storing normalized `relativePath` as a dedicated DB column if query/reporting requirements increase.
