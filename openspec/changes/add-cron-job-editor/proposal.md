---
change_type: implementation
priority: medium
dependencies: []
references:
  - docs/requirements.md
  - docs/design.md
  - src/components/cron-tab.tsx
  - app/api/cron/route.ts
  - openspec/specs/cron/spec.md
  - openspec/specs/agent-detail/spec.md
---

# Add Cron Job Detail View and Editor

**Change Type**: implementation

## Problem/Context

- Hermes Manager already exposes a per-agent `Cron` tab, but the current UI in `src/components/cron-tab.tsx` only supports list/create/action/output flows.
- Existing jobs cannot be inspected in detail or edited from the web UI even though `PUT /api/cron` already supports partial updates for fields such as `name`, `schedule`, `prompt`, `skills`, `deliver`, `repeat`, `model`, and `provider`.
- Operators currently have to fall back to CLI/chat flows or direct file inspection to understand a job’s full configuration and runtime state.
- This proposal stays within Hermes Manager’s control-plane scope by improving managed-agent operations for a single agent’s scheduled jobs rather than chasing general single-install dashboard parity.
- Official-dashboard-overlap classification: adapt. A cron editor is kept only insofar as it supports per-agent fleet operations, troubleshooting, and reproducible scheduler management inside the managed-agent detail workflow.

## Proposed Solution

- Extend the existing `Cron` tab so operators can open an existing job in a dedicated detail/editor surface from the job list.
- Show editable configuration fields for the existing job using the already-supported `/api/cron` update path, with save feedback and list refresh on success.
- Show read-only runtime metadata alongside editable fields so operators can troubleshoot without opening raw `jobs.json` or output files.
- Keep output viewing as a separate action/viewer and avoid changing the Hermes scheduler runtime, job execution engine, or cross-agent cron workflows.
- Update requirements/design/specs so the detail-and-edit workflow is documented as part of the canonical Cron tab behavior.

## Acceptance Criteria

- An operator can open an existing cron job from the `Cron` tab without leaving the agent detail page.
- The opened job view shows read-only runtime fields including `id`, `state`, `enabled`, `created_at`, `next_run_at`, `last_run_at`, `last_status`, and `last_error` when present.
- The opened job view allows editing and saving at least `name`, `schedule`, `prompt`, `skills`, `deliver`, `repeat`, `model`, and `provider`.
- Saving an edited job calls `PUT /api/cron` with only the intended editable fields plus `agent` and `id`, and the job list refreshes afterward.
- Invalid edited values (for example a malformed schedule or blank prompt) surface existing API validation errors to the operator without corrupting job state.
- The Cron tab continues to support create, pause/resume/run-now, delete, and output viewing after the editor is added.
- Documentation and OpenSpec deltas describe the job detail/editor workflow as part of the per-agent Cron management surface.

## Out of Scope

- Adding new scheduler semantics, execution backends, or real-time run-state streaming.
- Cross-agent cron dashboards or bulk cron editing.
- Editing raw runtime-owned fields such as `state`, `enabled`, `next_run_at`, `last_run_at`, or `last_status` directly from the editor.
- Expanding the webapp to support every Hermes cron field not already surfaced by the current file/API contract unless needed for the minimal editor workflow.
