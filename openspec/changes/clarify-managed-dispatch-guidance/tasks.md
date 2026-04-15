## Implementation Tasks

- [ ] Update `src/lib/delegation.ts` so the generated managed dispatch guidance uses dispatch-first wording, treats built-in `delegate_task` as a separate mechanism, prefers manager-managed dispatch when a listed subagent is a clear fit, and clarifies parent ownership on incomplete child results.
      verification: `tests/lib/delegation.test.ts` and related string assertions cover `dispatch.json`, the `delegate_task` separation note, dispatch-preferred wording, and parent-resume ownership guidance.
- [ ] Update managed policy persistence and sync behavior so canonical writes target `dispatch.json` while reads still fall back to legacy `delegation.json`.
      verification: unit tests cover canonical `dispatch.json` reads/writes, legacy fallback reads, and no-regression sync behavior for generated SOUL output.
- [ ] Update `src/components/delegation-tab.tsx` and translation files so the operator-facing tab and helper copy use `Dispatch` terminology without changing the compatibility API contract.
      verification: component/UI assertions or direct source inspection show `Dispatch` terminology in the tab label, help text, and preview copy.
- [ ] Update `docs/requirements.md`, `docs/design.md`, and `openspec/specs/agent-delegation/spec.md` so the managed-subagent workflow is documented as dispatch-focused guidance with `dispatch.json` canonical storage, `delegation.json` legacy fallback, `delegate_task` separation, and parent-resume ownership semantics.
      verification: changed docs/spec text explicitly mentions `dispatch.json`, the legacy fallback rule, the separate built-in `delegate_task` mechanism, and dispatch-preferred guidance.
- [ ] Run strict proposal validation and repository verification before implementation.
      verification: `python3 ~/.hermes/skills/cflx-proposal/scripts/cflx.py validate clarify-managed-dispatch-guidance --strict` passes, and future implementation work is expected to pass `npm run test && npm run typecheck && npm run lint`.

## Future Work

- Consider a follow-up proposal for durable lineage / completion tracking if operators later need enforceable end-to-end workflow ownership across multi-hop dispatch.
