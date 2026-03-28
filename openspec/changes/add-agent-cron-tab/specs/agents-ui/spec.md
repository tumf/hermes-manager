## MODIFIED Requirements

### Requirement: Agent details page provides operational tabs

The agent details page (`/agents/[name]`) MUST provide tabs for `Memory`, `Config`, `Cron`, and `Logs` so operators can manage scheduled jobs without leaving the page.

#### Scenario: Cron tab is visible with other operational tabs

Given a user opens `/agents/alpha`
When the page finishes rendering
Then the tab list includes `Memory`, `Config`, `Cron`, and `Logs`

### Requirement: Cron tab displays scheduled jobs with actions

The `Cron` tab MUST display a list of jobs loaded from `GET /api/cron?agent=...` and provide per-row actions for pause, resume, run-now, and delete.

#### Scenario: Job list renders name, schedule, and state badge

Given agent `alpha` has two cron jobs: one active and one paused
When the `Cron` tab renders
Then both jobs appear in a table showing name, schedule expression, and a state badge (`active` or `paused`)

#### Scenario: Delete action shows confirmation before removing

Given a job named `daily-summary` is listed
When the operator clicks the delete action for that job
Then a confirmation dialog appears before any DELETE request is sent

#### Scenario: Create job form submits and refreshes list

Given the operator clicks the `New Job` button
When a valid schedule and prompt are entered and the form is submitted
Then `POST /api/cron` is called and the job list refreshes showing the new job

#### Scenario: Empty state is shown when no jobs exist

Given agent `beta` has no cron jobs
When the `Cron` tab renders
Then the tab shows an empty state message and a `New Job` button

### Requirement: Cron output viewer shows recent execution results

Clicking a job row MUST open a viewer that lists recent output files and allows reading their content inline.

#### Scenario: Output file list is displayed

Given job `abc123` has two output files
When the operator clicks the job row to open the output viewer
Then `GET /api/cron/output?agent=alpha&id=abc123` is called and the filenames are shown

#### Scenario: File content is rendered on selection

Given the output viewer lists a file `2026-03-28_20-00-00.md`
When the operator clicks that file
Then `GET /api/cron/output?agent=alpha&id=abc123&file=2026-03-28_20-00-00.md` is called and the content is shown in a scrollable pre block
