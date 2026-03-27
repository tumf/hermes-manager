# Add Logs API

**Change Type**: implementation

## Summary

Implement HTTP endpoints for reading and streaming agent log files. Provides a
paginated tail endpoint and a Server-Sent Events (SSE) streaming endpoint so the
frontend can display live log output without WebSockets.

## Motivation

Agents write logs to well-known files inside their home directory. Operators need
to inspect recent log output and follow live output during troubleshooting. A
lightweight SSE stream avoids the complexity of WebSockets while still delivering
real-time updates.

## Scope

- GET /api/logs?agent=<name>&file=<filename>&lines=<N> — read last N lines
  (default 200, max 1000) from an allowed log file; returns {lines, totalBytes}
- GET /api/logs/stream?agent=<name>&file=<filename> — SSE endpoint that tails
  the file, sends last 50 lines on connect, then polls every 2 s for new content;
  sends ': keepalive' comments every 15 s

## Technical Notes

- Allowed filenames enforced via zod enum: gateway.log, gateway.error.log, errors.log
- Log path resolved as {agent.home}/logs/{file}
- Non-existent file returns {lines: [], totalBytes: 0} (not 404) for the REST
  endpoint; SSE waits for file creation
- File position tracking via byte offset avoids re-reading the entire file on
  each poll interval
- SSE reconnect handled by client's native EventSource retry; server restarts
  stream from current EOF on new connection
