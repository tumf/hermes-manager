## Implementation Tasks

- [x] Add dependency-discovery helpers for delegation metadata consumers in `src/lib/`.
      verification: unit tests cover finding only agents whose `delegation.json.allowedAgents` contains the updated target id.
- [x] Extend the metadata update flow to rebuild dependent assembled `SOUL.md` files after a successful `meta.json` write.
      verification: API/lib tests show dependents are refreshed while unrelated agents are untouched.
- [x] Keep metadata update semantics unchanged for unknown agents and `apiServerPort` preservation.
      verification: existing metadata update tests still pass.
- [x] Update `docs/requirements.md`, `docs/design.md`, and OpenSpec specs to document dependent SOUL regeneration on metadata change.
      verification: docs/specs explicitly mention metadata-driven delegation block refresh.
- [x] Run `npm run test && npm run typecheck && npm run lint`.
      verification: all commands pass.

## Future Work

- Consider batching or debounce controls if very large fleets make synchronous dependent regeneration expensive.
