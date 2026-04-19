## MODIFIED Requirements

### Requirement: Agent detail tabs focus on canonical managed-agent workflows

The agent detail UI SHALL expose Metadata, Memory, Config, Env, Skills, Delegation, Cron, Chat, and Logs tabs. MCP server configuration SHALL be handled inside the Config tab’s `config.yaml` editor rather than through a separate MCP tab. The Cron tab SHALL support listing jobs, opening an existing job for detail inspection, editing supported job fields, invoking runtime actions, and viewing execution output for the selected job.

#### Scenario: Operator opens an existing cron job from agent detail

**Given** operator opens an agent detail page for agent `alpha`
**When** the operator navigates to the `Cron` tab and selects an existing job from the job list
**Then** the page shows a job detail surface without leaving the agent detail workflow
**And** the surface displays read-only runtime metadata for that job such as `id`, `state`, `enabled`, `created_at`, `next_run_at`, `last_run_at`, `last_status`, and `last_error` when available

#### Scenario: Operator edits an existing cron job from agent detail

**Given** agent `alpha` has an existing cron job `abc123`
**When** the operator updates editable fields such as `name`, `schedule`, or `prompt` from the Cron tab editor and saves
**Then** the webapp calls `PUT /api/cron` for agent `alpha` and job `abc123`
**And** success refreshes the job list shown in the Cron tab
**And** API validation failures are shown to the operator without navigating away from the detail page
