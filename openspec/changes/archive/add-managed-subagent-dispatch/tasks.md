## Implementation Tasks

- [x] Add delegation policy data helpers in `src/lib/` for `runtime/agents/{agentId}/delegation.json`, including zod validation, default loading, atomic writes, and cycle detection across agent policies.
      verification: unit tests cover missing policy file, valid policy read/write, self-target rejection, and multi-agent cycle rejection.
- [x] Add `GET/PUT /api/agents/[id]/delegation` and `POST /api/agents/[id]/dispatch` with path safety and request validation.
      verification: API tests cover unknown agent, invalid body, blocked target, blocked revisit/maxHop, cycle-safe policy save, and successful dispatch path.
- [x] Extend `src/lib/soul-assembly.ts` (or adjacent helpers) so `SOUL.md` regeneration appends a machine-generated managed subagent YAML block from `delegation.json` and target agent metadata while preserving `SOUL.src.md` as the edit source.
      verification: unit tests cover multiline descriptions, tags, stable YAML rendering, and regeneration on policy/source change.
- [x] Add managed-skill synchronization using the existing copy-based skills machinery so the dispatch skill is auto-equipped/removed based on whether an agent has allowed subagents.
      verification: unit tests cover managed skill insertion, duplicate avoidance, and cleanup when `allowedAgents` becomes empty.
- [x] Add an Agent Detail `Delegation` tab and UI controls for allowed subagent selection, `maxHop`, validation errors, and generated-block preview, while keeping the existing Skills tab usable for user-managed skills.
      verification: component tests cover adding/removing allowed agents, save failure on cycle, and managed-skill status visibility.
- [x] Update the Memory tab and file APIs so `SOUL.src.md` remains the only editable source and the generated `SOUL.md` reflects delegation-block updates without direct user editing.
      verification: component/API tests cover generated preview refresh after delegation save and read-only generated output behavior.
- [x] Update `docs/requirements.md`, `docs/design.md`, and the relevant OpenSpec deltas to document delegation policy storage, managed skill enforcement, generated SOUL block semantics, and dispatch API behavior.
      verification: docs and spec deltas mention the new runtime files, UI tab, and enforcement flow.
- [x] Run `npm run test && npm run typecheck && npm run lint`.
      verification: all commands pass.

## Future Work

- Add operator-facing dispatch logs or workflow traces as a separate change if real debugging demand appears.
- Evaluate graph visualization separately after the basic policy workflow proves useful.
