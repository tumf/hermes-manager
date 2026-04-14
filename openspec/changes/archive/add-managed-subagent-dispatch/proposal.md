---
change_type: implementation
priority: high
dependencies: []
references:
  - AGENTS.md
  - docs/requirements.md
  - docs/design.md
  - openspec/specs/memory-tab/spec.md
  - openspec/specs/skills/spec.md
  - openspec/specs/agent-detail/spec.md
  - src/lib/soul-assembly.ts
  - src/lib/skill-links.ts
  - src/components/agent-memory-tab.tsx
  - src/components/skills-tab.tsx
---

# Add managed subagent dispatch

**Change Type**: implementation

## Problem / Context

Hermes Manager is positioned as a multi-agent control plane, but today each managed agent is still isolated from safe cross-agent orchestration. Operators can equip arbitrary skills and edit SOUL/metadata, yet there is no manager-enforced way to say:

- which other agents a given agent may call
- how cycles and excessive delegation depth are prevented
- how the allowed targets are surfaced inside generated SOUL instructions
- how the required dispatch skill is guaranteed to exist only on agents that are allowed to delegate

A pure prompt-only approach is insufficient because writing direct `hermes chat` instructions into `SOUL.md` would not actually enforce `allowed subagents`. Safe delegation needs a manager-owned control path that preserves Hermes Manager's role as a fleet control plane rather than a single-agent dashboard clone.

This proposal is intentionally kept as one implementation change instead of splitting policy generation, managed skill placement, and dispatch runtime into separate proposals. Shipping only one layer would create an unsafe partial state (for example, generated instructions without enforcement, or enforcement without an operator UI).

Decision relative to upstream overlap: adapt. Hermes Manager is not adding generic dashboard parity; it is adding operator-controlled, per-agent delegation policy for multi-agent operations on one host.

## Proposed Solution

Add manager-enforced subagent dispatch for selected agents.

1. Store per-agent delegation policy in `runtime/agents/{agentId}/delegation.json`.
2. Add an Agent Detail `Delegation` tab where operators choose allowed subagents and `maxHop`.
3. Automatically ensure a manager-owned dispatch skill is equipped only for agents whose delegation policy allows subagent calls.
4. Treat `SOUL.src.md` as the human-edited source and regenerate `SOUL.md` by appending a machine-generated YAML block that lists allowed subagents, their metadata (`id`, `name`, multiline `description`, `tags`), the managed dispatch skill name, and non-bypass rules.
5. Keep the agent-facing invocation method explicit by having the generated SOUL block point to the managed dispatch skill rather than to raw `hermes chat` commands.
6. Add a manager-controlled dispatch API that validates `allowedAgents`, revisit/cycle prevention metadata, and `maxHop` before the manager internally invokes Hermes on the target agent.
7. Keep direct raw cross-agent `hermes chat` invocation out of the agent-facing contract; agents must use the managed dispatch skill instead.

## Acceptance Criteria

- [ ] Operators can configure per-agent `allowedAgents` and `maxHop` from a dedicated Delegation tab in Agent Detail.
- [ ] Saving delegation policy rejects graph cycles and stores the accepted policy in `runtime/agents/{agentId}/delegation.json`.
- [ ] Agents with at least one allowed subagent automatically receive the managed dispatch skill, and agents without allowed subagents do not keep that managed skill equipped.
- [ ] Generated `SOUL.md` contains a machine-generated YAML block derived from policy + target agent metadata, while `SOUL.src.md` remains the user-edited source.
- [ ] The manager exposes a dispatch API that rejects unlisted targets, revisit/cycle attempts, and `maxHop` violations before invoking the target agent.
- [ ] `npm run test && npm run typecheck && npm run lint` pass after implementation.

## Out of Scope

- Automatic semantic routing across all agents based on search or embeddings
- Fleet-wide workflow analytics or delegation graph visualization
- Replacing Hermes native same-agent delegation primitives
- Remote-host or multi-machine cross-agent dispatch
- Public-facing access control or external authentication
