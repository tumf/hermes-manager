# Tasks — add-logs-api

## Implementation Tasks

- [x] Create src/lib/logs.ts with readLastNLines(filePath, n) helper that reads
      the last N lines from a file using a reverse-scan buffer strategy and returns
      {lines: string[], totalBytes: number}
- [x] Add zod schema for validated query params: agent (string), file (enum),
      lines (optional number 1-1000) in src/lib/logs.ts
- [x] Implement GET /api/logs route in app/api/logs/route.ts that validates query
      params, resolves the log file path from the agent DB record, calls readLastNLines,
      and returns JSON; return {lines: [], totalBytes: 0} when file is absent
- [x] Create src/lib/logs-stream.ts with a pollFileFromOffset(path, offset)
      helper that reads new bytes from a given byte offset and returns {chunk, newOffset}
- [x] Implement GET /api/logs/stream route in app/api/logs/stream/route.ts as an
      SSE endpoint using ReadableStream: send last 50 lines on connect, then poll
      every 2 s using pollFileFromOffset, flush ': keepalive' comment every 15 s
- [x] Ensure the SSE response sets headers Content-Type: text/event-stream,
      Cache-Control: no-cache, and Connection: keep-alive
- [x] Write unit tests in tests/api/logs.test.ts covering readLastNLines with
      missing file, line count capping at 1000, and file enum validation
- [x] Validate proposal with cflx validate add-logs-api --strict
