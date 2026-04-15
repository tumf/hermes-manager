---
change_type: implementation
priority: medium
dependencies: []
references:
  - docs/requirements.md
  - docs/design.md
  - src/lib/delegation.ts
  - src/components/delegation-tab.tsx
  - tests/lib/delegation.test.ts
  - openspec/specs/agent-delegation/spec.md
---

# Clarify managed dispatch guidance

**Change Type**: implementation

## Problem / Context

Hermes Manager already has a manager-owned dispatch skill and manager-controlled subagent dispatch path, but the surrounding product contract still uses `delegation` terminology in the policy file, UI, and generated guidance.

That wording now causes two practical problems:

- It collides conceptually with the built-in `delegate_task` tool, even though manager-managed subagent dispatch is a separate mechanism.
- It biases the parent agent toward self-handling, even when a listed managed subagent is a clearly better fit for the task.

The current generated guidance also under-specifies ownership semantics after a dispatch starts, which makes it too easy to confuse “child started” with “task completed”.

## Proposed Solution

Clarify the manager-managed workflow as a dispatch workflow rather than a generic delegation workflow, while keeping the runtime architecture intentionally compatible.

1. Adopt `dispatch.json` as the canonical persisted policy file and keep `delegation.json` as a legacy read fallback during migration.
2. Update operator-facing UI copy from `Delegation` to `Dispatch`, while keeping the existing compatibility API route if needed.
3. Rewrite generated managed-skill / SOUL guidance to use dispatch-first wording.
4. Treat built-in `delegate_task` as a separate built-in mechanism rather than something explicitly forbidden by the managed-subagent contract.
5. Change the guidance bias so that, when a listed managed subagent is a clear fit, the parent agent should prefer dispatching that slice of work instead of defaulting to self-handling.
6. Clarify ownership semantics so that a started child remains in-progress only; if the child stalls, fails, or returns an incomplete result, the parent resumes ownership and completes the task.
7. Update docs, spec deltas, and regression tests so the shipped behavior, operator UI, and generated guidance all describe the same dispatch-focused contract.

## Acceptance Criteria

- Hermes Manager treats `dispatch.json` as the canonical managed-subagent policy file.
- Hermes Manager still reads legacy `delegation.json` when `dispatch.json` is absent.
- Operator-facing UI uses `Dispatch` terminology for the managed-subagent policy tab and related helper text.
- Generated managed-skill / SOUL guidance uses dispatch-first wording instead of generic delegation wording, except where explicitly referencing legacy artifacts or built-in `delegate_task`.
- Generated guidance presents built-in `delegate_task` as a separate mechanism and does not explicitly forbid it.
- Generated guidance tells the parent agent to prefer manager-managed dispatch when a listed managed subagent is a clear fit.
- Generated guidance distinguishes “started” from “completed” and explicitly says the parent resumes ownership when a child does not finish cleanly.
- Docs and OpenSpec deltas describe the same dispatch terminology, compatibility rules, and ownership semantics.

## Out of Scope

- Changing the manager dispatch transport protocol itself
- Changing the built-in `delegate_task` tool behavior
- Adding lineage persistence or automatic workflow-completion tracking across multi-hop dispatch chains
- Reworking unrelated same-agent orchestration guidance outside the manager-managed subagent feature
