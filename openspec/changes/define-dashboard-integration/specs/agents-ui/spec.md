## MODIFIED Requirements

### Requirement: agents detail workflow remains operator-centric

The Hermes Manager UI MUST remain optimized for operating multiple managed Hermes agents on one host rather than acting as a general-purpose replacement for the official Hermes single-install dashboard.

#### Scenario: operator navigates between managed agents

**Given** multiple managed agents exist under `runtime/agents/`
**When** the operator uses the Hermes Manager UI
**Then** the primary workflow centers on selecting, provisioning, operating, and diagnosing individual managed agents
**And** the UI prioritizes lifecycle, deployment, and per-agent runtime controls over generic single-install exploration features

#### Scenario: future overlapping UI work is proposed

**Given** Hermes upstream provides an official dashboard feature that overlaps with a Hermes Manager UI area
**When** a new Hermes Manager proposal introduces or expands a similar feature
**Then** the proposal documents why the capability is required for multi-agent operations
**And** it states whether the feature is being kept, adapted, or deferred relative to the official dashboard
**And** it does not assume feature-parity with the official dashboard as a requirement by default

### Requirement: overlapping dashboard features stay scoped to agent operations

When Hermes Manager includes chat, session, log, cron, env, or skills interfaces, those interfaces MUST be scoped to workflows needed to operate a selected managed agent.

#### Scenario: operator uses chat and session interfaces

**Given** the operator opens the Chat tab for a managed agent
**When** they inspect sessions or send a message
**Then** the interface supports operational validation and resume/new-session control for that agent
**And** the product does not require Hermes Manager to become the most comprehensive standalone session exploration UI

#### Scenario: operator uses logs, cron, env, or skills interfaces

**Given** the operator opens Logs, Cron, Env, or Skills for a managed agent
**When** they perform management actions
**Then** the interfaces prioritize deployment, troubleshooting, and per-agent configuration safety
**And** roadmap decisions for those areas prefer multi-agent management value over broad single-agent dashboard parity
