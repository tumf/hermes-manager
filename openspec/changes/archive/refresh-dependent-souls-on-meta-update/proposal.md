---
change_type: implementation
priority: medium
dependencies: []
references:
  - AGENTS.md
  - docs/requirements.md
  - docs/design.md
  - src/lib/agents.ts
  - src/lib/delegation.ts
  - src/lib/delegation-sync.ts
  - src/lib/soul-assembly.ts
  - app/api/agents/[id]/meta/route.ts
  - openspec/specs/agent-metadata/spec.md
  - openspec/specs/agent-delegation/spec.md
---

# Refresh dependent SOUL.md files on agent metadata update

**Change Type**: implementation

## Problem / Context

Hermes Manager already regenerates an agent's own `SOUL.md` when its delegation policy changes, and that generated delegation block embeds each allowed target agent's `name`, `description`, and `tags` from `meta.json`.

However, when an operator updates an agent's metadata through `PUT /api/agents/{id}/meta`, existing upstream agents that already reference that agent in their delegation policy keep stale generated subagent metadata in their assembled `SOUL.md` until some unrelated later regeneration happens.

This is an operator-facing inconsistency in a multi-agent control plane:

- `meta.json` becomes the latest source of truth for the target agent
- `delegation.json` still points at that target agent
- dependent agents' generated `SOUL.md` blocks remain outdated

Because the generated block is runtime-facing contract, metadata updates should propagate to every dependent assembled `SOUL.md` that currently includes that agent as an allowed subagent.

Decision relative to upstream overlap: keep. This is not single-agent dashboard parity work; it preserves consistency of fleet-managed delegation metadata for multi-agent operations.

## Proposed Solution

1. Add a filesystem helper that scans `runtime/agents/*/delegation.json` and finds agents whose `allowedAgents` includes a given target agent id.
2. Reuse the existing SOUL regeneration path so each dependent agent rebuilds its generated `SOUL.md` from current source plus refreshed target metadata.
3. Trigger that dependent regeneration after successful `meta.json` updates via `PUT /api/agents/{id}/meta`.
4. Keep the regeneration best-effort but deterministic for all valid dependent agents that currently have delegating SOUL output.
5. Cover the behavior with unit/API tests and document the propagation rule in requirements/design/specs.

## Acceptance Criteria

- [ ] When `PUT /api/agents/{id}/meta` updates `name`, `description`, or `tags`, every agent whose `delegation.json.allowedAgents` contains `{id}` has its generated `SOUL.md` re-assembled.
- [ ] Re-assembly uses the latest target metadata values in the generated subagent block.
- [ ] Agents that do not delegate to the updated agent are not re-assembled.
- [ ] Existing `apiServerPort` preservation semantics for metadata updates remain unchanged.
- [ ] `npm run test && npm run typecheck && npm run lint` pass after implementation.

## Out of Scope

- Propagating metadata changes into unrelated files beyond generated delegation blocks
- Automatic service restarts when metadata changes
- Recomputing delegation graph structure beyond existing policy validation rules
