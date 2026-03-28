## Requirements

### Requirement: Cron jobs REST API reads and writes per-agent jobs.json

The `/api/cron` routes MUST read from and write to `{agent.home}/cron/jobs.json` using the Hermes-compatible JSON format (`{ jobs: [...], updated_at: ... }`). All writes MUST be atomic (write to `.tmp` then rename).

#### Scenario: GET returns jobs array for an agent

Given agent `alpha` has `{alpha.home}/cron/jobs.json` with two job entries
When `GET /api/cron?agent=alpha` is called
Then the response status is 200 and body contains a `jobs` array with two items

#### Scenario: GET returns empty array when jobs.json is absent

Given agent `beta` has no `cron/jobs.json` file
When `GET /api/cron?agent=beta` is called
Then the response status is 200 and body is `{ "jobs": [] }`

#### Scenario: POST creates a new job

Given a valid request body `{ agent: "alpha", schedule: "0 9 * * *", prompt: "run daily task", name: "daily" }`
When `POST /api/cron` is called
Then the response status is 201 and body contains `{ ok: true, id: "<uuid>" }`
And `{alpha.home}/cron/jobs.json` contains a new job with the given name and schedule

#### Scenario: POST rejects missing schedule

Given a request body missing the `schedule` field
When `POST /api/cron` is called
Then the response status is 400 with a JSON error body

#### Scenario: PUT updates an existing job's name

Given a job with id `abc123` exists in agent `alpha`'s jobs.json
When `PUT /api/cron` is called with `{ agent: "alpha", id: "abc123", name: "renamed" }`
Then the job's name is updated in jobs.json and the response is `{ ok: true }`

#### Scenario: DELETE removes a job by id

Given a job with id `abc123` exists
When `DELETE /api/cron?agent=alpha&id=abc123` is called
Then the job is removed from jobs.json and the response is `{ ok: true }`

#### Scenario: DELETE returns 404 for unknown id

Given no job with id `missing` exists
When `DELETE /api/cron?agent=alpha&id=missing` is called
Then the response status is 404

### Requirement: Cron job action endpoint handles pause, resume, and run-now

`POST /api/cron/action` MUST accept `{ agent, id, action }` where action is one of `pause`, `resume`, or `run`. It MUST update the corresponding state fields in jobs.json atomically.

#### Scenario: Pause sets state to paused

Given a job with `state: "scheduled"`
When `POST /api/cron/action` is called with `{ agent, id, action: "pause" }`
Then the job's `state` becomes `"paused"` and `enabled` becomes `false`

#### Scenario: Resume restores state to scheduled

Given a job with `state: "paused"`
When `POST /api/cron/action` is called with `{ agent, id, action: "resume" }`
Then the job's `state` becomes `"scheduled"` and `enabled` becomes `true`

#### Scenario: Run marks job for immediate execution

Given a scheduled or paused job
When `POST /api/cron/action` is called with `{ agent, id, action: "run" }`
Then the job's `next_run_at` is set to the current time (triggering pickup on next tick)

### Requirement: Cron output API exposes execution result files

`GET /api/cron/output?agent=<name>&id=<id>` MUST list markdown output files for the given job, sorted newest-first. With an additional `?file=<filename>` query parameter it MUST return the file content as a string.

#### Scenario: Output file list is returned for a job

Given job `abc123` has two output files under `{alpha.home}/cron/output/abc123/`
When `GET /api/cron/output?agent=alpha&id=abc123` is called
Then the response contains a `files` array with two filenames sorted newest-first

#### Scenario: Output file content is returned when file is specified

Given an output file `2026-03-28_20-00-00.md` exists for job `abc123`
When `GET /api/cron/output?agent=alpha&id=abc123&file=2026-03-28_20-00-00.md` is called
Then the response contains `{ content: "<file text>" }`

#### Scenario: Empty files list when no outputs exist

Given job `abc123` has no output files yet
When `GET /api/cron/output?agent=alpha&id=abc123` is called
Then the response is `{ files: [] }`
