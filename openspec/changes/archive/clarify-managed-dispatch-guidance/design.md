# Design: Clarify managed dispatch guidance

## Summary

This proposal keeps the existing manager-controlled subagent architecture but sharpens the contract around it:

- `dispatch` becomes the primary operator-facing term
- `dispatch.json` becomes canonical persisted state
- `delegation.json` remains a compatibility fallback for reads
- built-in `delegate_task` is documented as a separate mechanism, not a prohibited one
- generated guidance prefers dispatching suitable work to listed managed subagents rather than defaulting to self-handling
- the parent remains responsible for completion if a child does not finish cleanly

## Why this stays a single proposal

This change spans storage naming, UI wording, generated agent guidance, documentation, and tests. Those pieces are tightly coupled because operators and agents must see one coherent contract. Splitting docs/spec work from implementation would leave an inconsistent shipped behavior and reduce review clarity.

## Storage compatibility

The storage transition should be additive and low-risk:

1. Read `dispatch.json` first.
2. If absent, read legacy `delegation.json`.
3. Canonical saves write `dispatch.json`.
4. Legacy cleanup behavior may remove or ignore stale `delegation.json`, but read compatibility remains in place for existing agents until migration is complete.

This preserves existing operators' saved policies while allowing the product contract to move forward under `dispatch` terminology.

## UI and operator contract

Operators should see `Dispatch` consistently in the Agent Detail tab and preview text. The compatibility API route can remain stable to avoid unnecessary churn in unrelated code, but the user-facing contract should no longer frame the feature as generic delegation.

## Generated agent guidance

The generated managed skill / SOUL guidance should communicate four rules clearly:

1. Manager-managed subagent dispatch is the preferred path for listed, suitable subagents.
2. Built-in `delegate_task` is a different mechanism and is not the primary managed-subagent path.
3. Starting a child only means the work is in progress.
4. If the child result is incomplete or the child stalls, the parent resumes ownership and must still deliver a complete result.

## Verification impact

Regression coverage should prove:

- canonical `dispatch.json` storage
- legacy `delegation.json` fallback reads
- operator UI terminology changes
- generated wording for dispatch preference, `delegate_task` separation, and parent-resume ownership
