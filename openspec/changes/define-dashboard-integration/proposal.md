---
change_type: spec-only
priority: high
dependencies: []
references:
  - AGENTS.md
  - README.md
  - docs/requirements.md
  - docs/design.md
  - openspec/specs/agents-ui/spec.md
  - openspec/specs/chat/spec.md
  - openspec/specs/agent-templates/spec.md
  - /Users/tumf/.hermes/hermes-agent/website/docs/user-guide/features/web-dashboard.md
---

# Define dashboard integration strategy after upstream web dashboard adoption

**Change Type**: spec-only

## Problem / Context

Hermes Agent v0.9.0 introduced an official local web dashboard that overlaps with several areas already covered by hermes-agents, including sessions, logs, cron, env/config editing, and skills browsing.

Without an explicit product policy, hermes-agents risks drifting into a feature-for-feature clone of the upstream dashboard, creating three problems:

1. Product positioning becomes unclear because users cannot tell when to use the official dashboard versus hermes-agents.
2. Engineering effort may be wasted re-implementing upstream single-agent management features that will evolve faster in Hermes itself.
3. The project may neglect its strongest unique capabilities: multi-agent lifecycle management, template/partial-driven provisioning, and host-level service orchestration.

The repository's current requirements and design already emphasize multi-agent runtime management, launchd/systemd orchestration, per-agent HERMES_HOME isolation, templates, partials, and scoped env layering. The new upstream dashboard changes the prioritization of future work, not the core mission.

## Proposed Solution

Define a formal dashboard integration policy that classifies current and future UI capabilities into four buckets:

1. Core differentiators to double down on in hermes-agents:
   - multi-agent inventory and lifecycle management
   - per-agent provisioning, copy, template, and partial workflows
   - per-agent env layering and api_server port/service orchestration
   - host OS service management and deployment ergonomics
2. Shared capabilities to keep in hermes-agents only when they directly support multi-agent operations:
   - chat/session inspection inside an agent detail workflow
   - logs and cron views needed for agent operations
   - skills equip/unequip as per-agent deployment controls
3. Upstream-led capabilities that hermes-agents should not try to outgrow into a parallel full dashboard:
   - generic single-agent config surface completeness
   - global analytics and cost dashboards
   - standalone session exploration UX that is not tied to multi-agent management
4. Integration and interoperability principles:
   - prefer linking to or embedding upstream-compatible concepts over re-creating them blindly
   - treat official dashboard UX and schema as a reference for reusable patterns
   - keep hermes-agents focused on managing fleets of Hermes agents rather than replacing the official dashboard

## Acceptance Criteria

- [ ] A canonical product policy defines hermes-agents as a multi-agent management layer, not a replacement for the official single-install Hermes dashboard.
- [ ] The policy classifies capabilities into differentiators, shared-but-scoped features, upstream-led features, and integration opportunities.
- [ ] The policy states concrete roadmap rules for sessions/chat, logs, cron, skills, env/config, analytics, templates, and partials.
- [ ] The policy documents how future proposals should justify any overlap with the official dashboard.
- [ ] `python3 /Users/tumf/.agents/skills/cflx-proposal/scripts/cflx.py validate define-dashboard-integration --strict` passes.

## Out of Scope

- Immediate implementation of embeds, deep links, or analytics screens
- Removal of existing chat/log/cron functionality from hermes-agents
- UI redesign work
- Changes to upstream Hermes Agent itself
