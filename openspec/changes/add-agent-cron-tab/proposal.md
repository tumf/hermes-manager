# Add Agent Cron Tab

## Problem/Context

- The agent detail page (`app/agents/[name]/page.tsx`) currently exposes `Memory`, `Config`, and `Logs` tabs only.
- Hermes Agent supports per-agent scheduled jobs stored in `{HERMES_HOME}/cron/jobs.json` (JSON file managed by the Hermes runtime).
- Each job carries a schedule (cron expression or interval), prompt, optional skills list, delivery target, repeat count, and runtime state (`enabled`, `state`, `next_run_at`, `last_run_at`, `last_status`).
- Job execution outputs are saved under `{HERMES_HOME}/cron/output/{job_id}/{timestamp}.md`.
- There is currently no Web UI for managing these jobs; operators must use the `hermes cron` CLI or chat commands.

## Proposed Solution

- Add a `Cron` tab to the agent detail page in `app/agents/[name]/page.tsx`.
- Implement a read/write REST API under `/api/cron` that operates on the agent's `{home}/cron/jobs.json` file directly (same format as the Hermes runtime uses).
- Provide CRUD operations for jobs plus pause/resume/run-now actions.
- Allow viewing recent execution output files inline via `/api/cron/output`.

## Acceptance Criteria

- Agent detail page shows a `Cron` tab alongside existing tabs.
- `Cron` tab lists all jobs with name, schedule, state badge, next run time, last run time, and last status.
- Operator can create a new job (schedule, name, prompt, optional skills, deliver, optional repeat).
- Operator can edit an existing job's fields inline or via a dialog.
- Operator can pause, resume, trigger immediately, or delete a job with confirmation.
- Operator can click a job to view recent output files with markdown-rendered content.
- API validates schedule expressions (basic cron syntax check) and rejects blank prompts.
- All file writes are atomic (`.tmp` → rename) to avoid corrupting the runtime's jobs.json.
- Docs and specs are updated to reflect the new tab and API.

## Out of Scope

- Creating or modifying the Hermes cron scheduler itself (tick loop, execution engine).
- Cross-agent cron management (bulk operations across agents).
- Real-time job execution status streaming (SSE for running jobs).
- Authentication / access control beyond existing app-level assumptions.
