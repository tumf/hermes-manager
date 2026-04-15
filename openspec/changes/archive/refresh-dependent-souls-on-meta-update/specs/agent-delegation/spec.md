## MODIFIED Requirements

### Requirement: Generated SOUL output includes managed subagent block

When delegation policy is enabled for an agent, Hermes Manager MUST regenerate runtime-facing `SOUL.md` so it includes a machine-generated block describing the managed dispatch skill, delegation rules, and allowed subagents.

#### Scenario: Generated block lists allowed subagents with metadata

**Given** agent `planner01` has `SOUL.src.md`
**And** `planner01` allows `research01`
**And** agent `research01` has `name`, multiline `description`, and `tags` metadata
**When** Hermes Manager regenerates `planner01` runtime `SOUL.md`
**Then** the generated output includes a managed YAML block for subagents
**And** the block lists `research01` with its `id`, `name`, multiline `description`, and `tags`
**And** the block states that direct raw Hermes invocation is not allowed

#### Scenario: Human-edited SOUL source remains separate from generated output

**Given** partial/source mode is enabled for agent `planner01`
**When** an operator edits `SOUL.src.md`
**Then** `SOUL.src.md` remains the human-edited source file
**And** the delegation block is added only to generated `SOUL.md`

#### Scenario: Target metadata changes refresh dependent generated SOUL output

**Given** agent `planner01` allows `research01`
**And** `planner01` already has generated `SOUL.md` containing `research01` metadata in the managed subagent block
**When** Hermes Manager updates `research01` metadata
**Then** Hermes Manager regenerates `planner01` runtime `SOUL.md`
**And** the managed subagent block reflects the latest `research01` metadata
