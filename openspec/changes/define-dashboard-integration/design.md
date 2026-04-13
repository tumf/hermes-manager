# Dashboard integration strategy

## Overview

Hermes Agent now ships an official local web dashboard for managing one Hermes installation. Hermes Manager should respond by clarifying boundaries instead of entering an unbounded UI overlap race.

The design goal is to preserve Hermes Manager as the operator console for running many Hermes agents on one host while reusing the official dashboard as the reference implementation for single-agent introspection UX.

## Product boundary

### Official dashboard owns the single-install experience

The official dashboard is the primary UX for:

- exhaustive single-agent config editing
- local session exploration and search
- analytics/cost views
- generic logs/env/cron/skills browsing for one Hermes home

### Hermes Manager owns the multi-agent control plane

Hermes Manager is the primary UX for:

- creating, copying, deleting, and inventorying many agents
- assigning isolated HERMES_HOME directories
- managing launchd/systemd lifecycle for each agent
- assigning and preserving per-agent api_server ports
- layering global and agent env values
- provisioning skills per agent
- provisioning agent identity via templates and shared partials
- providing just-enough embedded operations UI inside each agent detail view

## Capability policy

### Keep and strengthen in Hermes Manager

1. Agent inventory and lifecycle
   - list, create, copy, delete
   - install/start/stop/restart/status
   - host-specific service diagnostics
2. Agent provisioning
   - template selection at creation time
   - save-as-template flows
   - shared partial management
   - partial-aware SOUL authoring
3. Agent-scoped deployment state
   - api_server port allocation and repair
   - global/agent env merge visibility
   - per-agent skills equip/unequip

### Keep, but scope tightly to operations

1. Chat and sessions
   - retain agent-detail chat because it validates that a selected managed agent is working
   - optimize for resume/new-session workflows and operational inspection
   - avoid turning Hermes Manager into the richest standalone session-mining UI
2. Logs
   - retain tailing and streaming because operators need incident response per agent
   - prioritize service and runtime diagnostics over cross-session observability features
3. Cron
   - retain per-agent cron CRUD and output inspection
   - prioritize job deployment and troubleshooting rather than fleetwide analytics dashboards
4. Skills browser
   - retain tree/equip UX focused on what is installed into each managed agent
   - avoid broad skill-discovery features whose main purpose is catalog browsing independent of agent assignment

### Do not chase as primary product goals

1. Single-agent config completeness parity with upstream dashboard
2. Global analytics and cost reporting dashboards
3. Session exploration features whose main purpose is retrospective analysis rather than managed-agent operations
4. Generic environment management polish beyond what is needed for multi-agent deployment safety

## Integration rules for future proposals

Any future proposal that overlaps the official dashboard must state:

1. why the feature is necessary for multi-agent operations in Hermes Manager,
2. whether the feature should be keep/adapt/defer relative to upstream,
3. what unique operator workflow Hermes Manager serves that the upstream dashboard does not,
4. why a link, reference pattern, or narrower scoped implementation is insufficient.

## Roadmap consequences

### Near-term

- continue improving agent lifecycle reliability, service adapters, and api_server compatibility
- continue investing in templates, partials, and agent provisioning UX
- improve chat/log/cron only where it reduces operator friction managing many agents

### Medium-term

- consider upstream-inspired improvements for session search, config schema rendering, and analytics only if they can be applied to multi-agent workflows
- prefer composable or link-based integrations over duplicating entire upstream experiences

### Explicit non-goal

Hermes Manager is not trying to become the only dashboard a single Hermes install ever needs. Its strategic role is to make many Hermes agents manageable as a coherent local fleet.

## Documentation consequences

- `AGENTS.md` の CoreConcepts にこの境界を明文化する
- `docs/requirements.md` と `docs/design.md` は multi-agent control plane という製品定義に合わせる
- `README` は公式 dashboard との差別化とポジショニングを最初に伝える
