## Requirements

### Requirement: Per-agent delegation policy storage

Hermes Manager MUST store per-agent managed-subagent dispatch policy in the filesystem so that operators can explicitly define which managed agents may call which other managed agents.

Canonical persisted state MUST use `runtime/agents/{agentId}/dispatch.json`.
If `dispatch.json` is absent, Hermes Manager MUST read legacy `runtime/agents/{agentId}/delegation.json` for backward compatibility.

#### Scenario: Save dispatch policy for one agent

**Given** operator configures agent `planner01` with `allowedAgents = ["research01", "coder02"]` and `maxHop = 3`
**When** the system saves the managed dispatch policy
**Then** the system writes `runtime/agents/planner01/dispatch.json`
**And** the saved file contains `allowedAgents` and `maxHop` for `planner01`

#### Scenario: Missing dispatch policy means managed dispatch is disabled

**Given** agent `reviewer03` has no `runtime/agents/reviewer03/dispatch.json`
**And** agent `reviewer03` has no legacy `runtime/agents/reviewer03/delegation.json`
**When** Hermes Manager reads managed dispatch settings for `reviewer03`
**Then** the system treats managed dispatch as disabled for that agent
**And** no allowed subagents are exposed

#### Scenario: Legacy delegation policy is still read during migration

**Given** agent `planner01` has no `runtime/agents/planner01/dispatch.json`
**And** agent `planner01` has legacy `runtime/agents/planner01/delegation.json`
**When** Hermes Manager reads managed dispatch settings for `planner01`
**Then** the system loads the legacy policy data
**And** the operator can continue using the existing saved policy until canonical state is rewritten

### Requirement: Delegation policy save rejects cycles

Hermes Manager MUST reject delegation policy changes that introduce cycles in the fleet-wide allowed-subagent graph.

#### Scenario: Direct cycle is rejected

**Given** agent `a01` already allows `b01`
**When** an operator tries to save policy for `b01` with `allowedAgents = ["a01"]`
**Then** the system rejects the save
**And** no new `delegation.json` state is committed for the invalid policy

#### Scenario: Indirect cycle is rejected

**Given** agent `a01` allows `b01`
**And** agent `b01` allows `c01`
**When** an operator tries to save policy for `c01` with `allowedAgents = ["a01"]`
**Then** the system rejects the save because it would create a cycle

### Requirement: Managed dispatch skill is synchronized from delegation policy

Hermes Manager MUST automatically equip the manager-owned subagent dispatch skill only on agents whose managed dispatch policy allows at least one subagent.

#### Scenario: Managed dispatch skill is equipped when dispatch is enabled

**Given** agent `planner01` saves a managed dispatch policy with at least one allowed subagent
**When** policy synchronization completes
**Then** the manager-owned dispatch skill exists under `runtime/agents/planner01/skills/`
**And** operators do not need to equip that dispatch skill manually

#### Scenario: Managed dispatch skill is removed when dispatch is disabled

**Given** agent `planner01` previously had the manager-owned dispatch skill equipped by policy
**When** its managed dispatch policy is updated so `allowedAgents` becomes empty
**Then** Hermes Manager removes the manager-owned dispatch skill from `runtime/agents/planner01/skills/`

### Requirement: Generated SOUL output includes managed subagent block

When managed dispatch policy is enabled for an agent, Hermes Manager MUST regenerate runtime-facing `SOUL.md` so it includes a machine-generated block describing the managed dispatch skill, dispatch rules, and allowed subagents.

#### Scenario: Generated block lists allowed subagents with metadata

**Given** agent `planner01` has `SOUL.src.md`
**And** `planner01` allows `research01`
**And** agent `research01` has `name`, multiline `description`, and `tags` metadata
**When** Hermes Manager regenerates `planner01` runtime `SOUL.md`
**Then** the generated output includes a managed YAML block for subagents
**And** the block lists `research01` with its `id`, `name`, multiline `description`, and `tags`
**And** the block states that direct raw Hermes invocation is not allowed

#### Scenario: Generated guidance prefers suitable managed dispatch over self-handling

**Given** agent `planner01` has at least one listed managed subagent suited to a requested task slice
**When** Hermes Manager generates the managed dispatch guidance for `planner01`
**Then** the guidance tells the parent agent to prefer manager-managed dispatch for that slice of work
**And** the guidance does not default to parent self-handling when a listed managed subagent is a clear fit

#### Scenario: Generated guidance treats built-in delegate_task as a separate mechanism

**Given** Hermes Manager generates managed dispatch guidance for an agent with allowed subagents
**When** the runtime-facing managed skill or SOUL block references dispatch mechanisms
**Then** the guidance describes built-in `delegate_task` as a separate built-in mechanism
**And** the guidance does not explicitly forbid `delegate_task`
**And** the guidance still presents the manager-managed dispatch path as the preferred path for listed managed subagents

#### Scenario: Parent ownership resumes when child does not finish cleanly

**Given** a parent agent dispatches work to a listed managed subagent
**When** the child stalls, fails, or returns an incomplete result
**Then** the generated guidance tells the parent agent that the task is not complete
**And** the parent agent remains responsible for resuming ownership and delivering a complete result

#### Scenario: Human-edited SOUL source remains separate from generated output

**Given** partial/source mode is enabled for agent `planner01`
**When** an operator edits `SOUL.src.md`
**Then** `SOUL.src.md` remains the human-edited source file
**And** the dispatch block is added only to generated `SOUL.md`

#### Scenario: Target metadata changes refresh dependent generated SOUL output

**Given** agent `planner01` allows `research01`
**And** `planner01` already has generated `SOUL.md` containing `research01` metadata in the managed subagent block
**When** Hermes Manager updates `research01` metadata
**Then** Hermes Manager regenerates `planner01` runtime `SOUL.md`
**And** the managed subagent block reflects the latest `research01` metadata

### Requirement: Manager-controlled dispatch enforces allowed subagents

Hermes Manager MUST expose a manager-controlled dispatch path that validates source-agent policy before invoking a target managed agent.

#### Scenario: Dispatch to an allowed subagent succeeds

**Given** source agent `planner01` allows target agent `research01`
**And** the dispatch request includes a valid message
**When** the managed dispatch path is invoked for `planner01 -> research01`
**Then** Hermes Manager accepts the request
**And** it invokes the target managed agent through the manager-owned execution path

#### Scenario: Dispatch to an unlisted target is rejected

**Given** source agent `planner01` does not allow target agent `reviewer03`
**When** the managed dispatch path is invoked for `planner01 -> reviewer03`
**Then** Hermes Manager rejects the request
**And** the target agent is not invoked

### Requirement: Runtime dispatch prevents revisit and max-hop violations

Hermes Manager MUST reject runtime dispatch requests that revisit an already traversed agent in the current workflow or exceed the source agent's configured maximum hop count.

#### Scenario: Revisit in the same workflow is rejected

**Given** source agent `planner01` sends a dispatch request with `dispatchPath = ["planner01", "research01"]`
**When** the request targets `research01` again
**Then** Hermes Manager rejects the request as a revisit

#### Scenario: Hop limit violation is rejected

**Given** source agent `planner01` has `maxHop = 2`
**And** the dispatch request has `hopCount = 2`
**When** the source agent attempts another managed dispatch
**Then** Hermes Manager rejects the request because the hop limit would be exceeded

### Requirement: Per-agent delegation policy storage

Hermes Manager MUST store per-agent managed-subagent dispatch policy in the filesystem so that operators can explicitly define which managed agents may call which other managed agents.

Canonical persisted state MUST use `runtime/agents/{agentId}/dispatch.json`.
If `dispatch.json` is absent, Hermes Manager MUST read legacy `runtime/agents/{agentId}/delegation.json` for backward compatibility.

#### Scenario: Save dispatch policy for one agent

**Given** operator configures agent `planner01` with `allowedAgents = ["research01", "coder02"]` and `maxHop = 3`
**When** the system saves the managed dispatch policy
**Then** the system writes `runtime/agents/planner01/dispatch.json`
**And** the saved file contains `allowedAgents` and `maxHop` for `planner01`

#### Scenario: Missing dispatch policy means managed dispatch is disabled

**Given** agent `reviewer03` has no `runtime/agents/reviewer03/dispatch.json`
**And** agent `reviewer03` has no legacy `runtime/agents/reviewer03/delegation.json`
**When** Hermes Manager reads managed dispatch settings for `reviewer03`
**Then** the system treats managed dispatch as disabled for that agent
**And** no allowed subagents are exposed

#### Scenario: Legacy delegation policy is still read during migration

**Given** agent `planner01` has no `runtime/agents/planner01/dispatch.json`
**And** agent `planner01` has legacy `runtime/agents/planner01/delegation.json`
**When** Hermes Manager reads managed dispatch settings for `planner01`
**Then** the system loads the legacy policy data
**And** the operator can continue using the existing saved policy until canonical state is rewritten

### Requirement: Managed dispatch skill is synchronized from delegation policy

Hermes Manager MUST automatically equip the manager-owned subagent dispatch skill only on agents whose managed dispatch policy allows at least one subagent.

#### Scenario: Managed dispatch skill is equipped when dispatch is enabled

**Given** agent `planner01` saves a managed dispatch policy with at least one allowed subagent
**When** policy synchronization completes
**Then** the manager-owned dispatch skill exists under `runtime/agents/planner01/skills/`
**And** operators do not need to equip that dispatch skill manually

#### Scenario: Managed dispatch skill is removed when dispatch is disabled

**Given** agent `planner01` previously had the manager-owned dispatch skill equipped by policy
**When** its managed dispatch policy is updated so `allowedAgents` becomes empty
**Then** Hermes Manager removes the manager-owned dispatch skill from `runtime/agents/planner01/skills/`

### Requirement: Generated SOUL output includes managed subagent block

When managed dispatch policy is enabled for an agent, Hermes Manager MUST regenerate runtime-facing `SOUL.md` so it includes a machine-generated block describing the managed dispatch skill, dispatch rules, and allowed subagents.

#### Scenario: Generated block lists allowed subagents with metadata

**Given** agent `planner01` has `SOUL.src.md`
**And** `planner01` allows `research01`
**And** agent `research01` has `name`, multiline `description`, and `tags` metadata
**When** Hermes Manager regenerates `planner01` runtime `SOUL.md`
**Then** the generated output includes a managed YAML block for subagents
**And** the block lists `research01` with its `id`, `name`, multiline `description`, and `tags`
**And** the block states that direct raw Hermes invocation is not allowed

#### Scenario: Generated guidance prefers suitable managed dispatch over self-handling

**Given** agent `planner01` has at least one listed managed subagent suited to a requested task slice
**When** Hermes Manager generates the managed dispatch guidance for `planner01`
**Then** the guidance tells the parent agent to prefer manager-managed dispatch for that slice of work
**And** the guidance does not default to parent self-handling when a listed managed subagent is a clear fit

#### Scenario: Generated guidance treats built-in delegate_task as a separate mechanism

**Given** Hermes Manager generates managed dispatch guidance for an agent with allowed subagents
**When** the runtime-facing managed skill or SOUL block references dispatch mechanisms
**Then** the guidance describes built-in `delegate_task` as a separate built-in mechanism
**And** the guidance does not explicitly forbid `delegate_task`
**And** the guidance still presents the manager-managed dispatch path as the preferred path for listed managed subagents

#### Scenario: Parent ownership resumes when child does not finish cleanly

**Given** a parent agent dispatches work to a listed managed subagent
**When** the child stalls, fails, or returns an incomplete result
**Then** the generated guidance tells the parent agent that the task is not complete
**And** the parent agent remains responsible for resuming ownership and delivering a complete result
