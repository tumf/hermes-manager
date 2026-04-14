# Managed subagent dispatch design

## Overview

This change adds a manager-owned cross-agent delegation layer for Hermes Manager. The goal is not generic agent autonomy; it is operator-controlled, per-agent subagent dispatch inside a local multi-agent fleet.

The core enforcement rule is:

- agents never directly invoke other agents through raw `hermes chat`
- agents that are allowed to delegate receive one managed dispatch skill
- that skill calls Hermes Manager's dispatch API
- Hermes Manager validates policy before internally invoking the target agent

## Why this belongs in Hermes Manager

This feature improves multi-agent operations rather than chasing upstream dashboard parity.

Operators need to:

- provision specialist agents
- allow specific agents to call only specific subagents
- keep delegation paths safe and reproducible
- regenerate runtime-facing instructions consistently

Those are fleet-control concerns that belong in Hermes Manager.

## Data model

### `delegation.json`

Path:

- `runtime/agents/{agentId}/delegation.json`

Proposed shape:

```json
{
  "maxHop": 3,
  "allowedAgents": ["research01", "coder02"]
}
```

Rules:

- `allowedAgents` contains agent IDs only
- self-reference is invalid
- `maxHop` is an integer in a conservative bounded range (for example 1..8)
- missing file means delegation disabled for that agent

### Generated SOUL block

`SOUL.md` remains a generated runtime file. `SOUL.src.md` is the human-edited source.

Append a manager-owned block to the assembled SOUL output:

```yaml
<!-- HERMES_MANAGER_SUBAGENTS_V1_BEGIN -->
subagents:
  dispatchSkill: hermes-manager-subagent-dispatch
  directHermesInvocationAllowed: false
  rules:
    onlyListedAgents: true
    forbidRevisitInSameWorkflow: true
    forbidCyclicDispatch: true
    maxHop: 3
  agents:
    - id: research01
      name: Research Agent
      description: |-
        外部情報の調査、比較、要約、選択肢整理
      tags:
        - research
        - summary
        - comparison
<!-- HERMES_MANAGER_SUBAGENTS_V1_END -->
```

Rendering rules:

- always emit stable key order
- always render `description` as block scalar `|-` even for one-line descriptions
- preserve target agent order from `allowedAgents`
- include only currently existing allowed targets; policy save should reject unknown IDs before this stage

## Managed skill strategy

Skill name:

- `hermes-manager-subagent-dispatch`

Behavior:

- manager-owned skill, copied into `{agent.home}/skills/...` using the same copy-based mechanism as other skills
- auto-equipped when `allowedAgents.length > 0`
- auto-removed when `allowedAgents.length === 0`
- represented separately in UI as a managed skill so operators understand it is policy-driven, not a normal manually equipped skill

The skill content teaches the agent to:

- inspect the generated SOUL block
- choose one listed target
- call Hermes Manager dispatch
- never invoke raw cross-agent `hermes chat`

## API design

### GET /api/agents/{id}/delegation

Returns:

```json
{
  "maxHop": 3,
  "allowedAgents": ["research01", "coder02"],
  "availableAgents": [
    {
      "id": "research01",
      "name": "Research Agent",
      "description": "...",
      "tags": ["research"]
    }
  ],
  "managedSkill": {
    "relativePath": "hermes-manager/hermes-manager-subagent-dispatch",
    "equipped": true
  },
  "generatedBlock": "...yaml..."
}
```

`availableAgents` excludes the current agent.

### PUT /api/agents/{id}/delegation

Request body:

```json
{
  "maxHop": 3,
  "allowedAgents": ["research01", "coder02"]
}
```

Behavior:

1. validate request with zod
2. reject unknown agent IDs and self-reference
3. run global cycle detection on the resulting policy graph
4. atomically write `delegation.json`
5. synchronize managed skill equip state
6. regenerate `SOUL.md` if `SOUL.src.md` exists, or regenerate the managed block into runtime-facing SOUL output if source mode is already enabled per current Memory-tab behavior

### POST /api/agents/{id}/dispatch

Meaning:

- `{id}` is the source agent performing dispatch through the managed skill

Request body:

```json
{
  "targetAgentId": "research01",
  "message": "Investigate the latest gateway restart failure",
  "sessionId": "20260401_222222_yyyy",
  "workflowId": "wf_abc123",
  "dispatchPath": ["planner01"],
  "hopCount": 1
}
```

Validation/enforcement:

- source agent exists
- target agent exists
- target is in source `allowedAgents`
- target is not already in `dispatchPath`
- `hopCount + 1 <= maxHop`
- request is rejected if any rule fails

Execution:

- Manager resolves target HERMES_HOME internally
- Manager invokes Hermes for the target agent internally
- the exact internal command remains an implementation detail and is not part of the agent-facing contract

## Cycle prevention

Use two layers.

### Save-time graph validation

When saving `delegation.json`, compute the directed graph of all current agent policies plus the pending update.
Reject any update that introduces a cycle.

Examples:

- `A -> B`, `B -> A` rejected
- `A -> B`, `B -> C`, `C -> A` rejected

### Runtime revisit / hop checks

Even if the static graph is acyclic, runtime workflows can still attempt illegal revisits.
Use:

- `workflowId`
- `dispatchPath`
- `hopCount`

Reject if:

- `targetAgentId` already exists in `dispatchPath`
- resulting hop exceeds `maxHop`

## UI design

### Agent Detail: Delegation tab

Add a new tab to Agent Detail.

Contents:

- allowed subagents list
- add/remove controls from existing agent inventory
- `maxHop` numeric input
- validation error display
- managed skill status summary
- generated YAML block preview

This is operator-facing provisioning UI, not a general graph explorer.

### Memory tab interaction

The current Memory tab already distinguishes `SOUL.src.md` from generated `SOUL.md`.
Extend that contract so delegation changes also refresh the generated output.

Implications:

- `SOUL.src.md` remains the only human-edited source
- generated `SOUL.md` stays preview-only when source mode is active
- delegation saves trigger regeneration so operators can immediately inspect the final block

### Skills tab interaction

Keep user-managed skills and managed dispatch skill visually distinct.

Suggested UI:

- normal skill tree remains for manual equip/unequip
- managed dispatch skill shown in a small status card or dedicated managed section
- manual removal of the managed skill is either blocked or immediately reconciled on next policy sync

## Implementation notes

- prefer reusable helpers for policy load/save/validate/sync instead of embedding logic in route handlers
- keep dispatch command execution behind one library function so future api_server-based dispatch remains possible
- avoid making generated SOUL text the source of truth; `delegation.json` + agent metadata remain authoritative
