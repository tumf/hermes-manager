# Logs API Spec

## Requirements

### Requirement: Tail endpoint returns last N lines with totals

GET /api/logs MUST accept agent, file, and optional lines (default 200, max 1000)
and return JSON {lines: string[], totalBytes: number}. Only gateway.log,
gateway.error.log, and errors.log are allowed.

#### Scenario: Default line count

Given a log file containing more than 200 lines,
When GET /api/logs?agent=alice&file=gateway.log is called without lines,
Then the response contains exactly 200 lines and totalBytes equals the file size.

#### Scenario: Line cap enforced

Given a log file with 5000 lines,
When GET /api/logs?agent=alice&file=gateway.log&lines=5000 is called,
Then the response contains exactly 1000 lines (cap) and status is 200.

#### Scenario: Disallowed filename rejected

When GET /api/logs?agent=alice&file=secrets.txt is called,
Then the response status is 400 with a zod validation error.

#### Scenario: Missing file returns empty result

Given the requested log file does not exist,
When GET /api/logs?agent=alice&file=gateway.log is called,
Then the response JSON is {lines: [], totalBytes: 0} and status is 200.

### Requirement: SSE stream tails logs with keepalive

GET /api/logs/stream MUST open an SSE stream for an allowed log file, send the
existing tail (last 50 lines) on connect, then poll the file every 2 seconds for
new content using a byte offset. A keepalive comment ': keepalive' MUST be sent
at least every 15 seconds.

#### Scenario: Initial tail is sent

Given a log file with at least 50 lines,
When a client connects to /api/logs/stream?agent=alice&file=gateway.log,
Then the server first sends 50 lines as SSE data frames in order.

#### Scenario: New content is streamed

Given new lines are appended to the log file after connection,
When the server polls at 2-second intervals,
Then new lines are emitted as SSE data frames in order without duplicates.

#### Scenario: Keepalive frames sent

When the log file has no new content for more than 15 seconds,
Then the server sends ': keepalive' comments to keep the connection alive.

#### Scenario: Reconnect resumes from current EOF

Given the client disconnects and reconnects later,
When a new connection is established,
Then the server starts tailing from the current EOF without replaying old lines.
