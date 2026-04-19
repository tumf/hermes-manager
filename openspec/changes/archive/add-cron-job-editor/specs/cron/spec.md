## MODIFIED Requirements

### Requirement: Cron jobs REST API reads and writes per-agent jobs.json

The `/api/cron` routes MUST read from and write to `{agent.home}/cron/jobs.json` using the Hermes-compatible JSON format (`{ jobs: [...], updated_at: ... }`). All writes MUST be atomic (write to `.tmp` then rename). Existing jobs exposed through this API MUST preserve enough configuration and runtime metadata for the Cron tab to inspect and edit a job without reading raw files directly.

#### Scenario: GET returns existing-job fields needed by the editor

Given agent `alpha` has `{alpha.home}/cron/jobs.json` containing a job with configuration fields `name`, `schedule`, `prompt`, `skills`, `deliver`, `repeat`, `model`, and `provider`
When `GET /api/cron?agent=alpha` is called
Then the response status is 200
And the matching job entry includes those persisted configuration fields
And the matching job entry includes runtime metadata such as `id`, `state`, `enabled`, `created_at`, `next_run_at`, `last_run_at`, `last_status`, and `last_error` when present in `jobs.json`

#### Scenario: PUT updates an existing job's editable configuration

Given a job with id `abc123` exists in agent `alpha`'s jobs.json
When `PUT /api/cron` is called with `{ agent: "alpha", id: "abc123", name: "renamed", schedule: "0 9 * * *", prompt: "updated task", skills: ["skill-a"], deliver: "telegram", repeat: { "times": 3 }, model: "claude-sonnet-4", provider: "anthropic" }`
Then the response is `{ ok: true }`
And the matching job in `{alpha.home}/cron/jobs.json` reflects the submitted editable fields
And unrelated jobs remain unchanged

### Requirement: Cron output API exposes execution result files

`GET /api/cron/output?agent=<name>&id=<id>` MUST list markdown output files for the given job, sorted newest-first. With an additional `?file=<filename>` query parameter it MUST return the file content as a string.

#### Scenario: Output viewer remains available for an edited job

Given job `abc123` has at least one output file under `{alpha.home}/cron/output/abc123/`
When an operator opens the existing job from the Cron tab and requests its output
Then the webapp can still call `GET /api/cron/output?agent=alpha&id=abc123`
And the response contains a `files` array for that same job
